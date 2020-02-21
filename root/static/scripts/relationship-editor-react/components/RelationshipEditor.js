/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

// $FlowIgnore[untyped-import]
import deepFreeze from 'deep-freeze-strict';
import * as React from 'react';

import {
  cmpPhraseGroupLinkTypeInfo,
} from '../../../../utility/groupRelationships';
import {NON_URL_RELATABLE_ENTITIES} from '../../common/constants';
import linkedEntities from '../../common/linkedEntities';
import {keyBy, sortedIndexWith} from '../../common/utility/arrays';
import {hasSessionStorage} from '../../common/utility/storage';
import MB from '../../common/MB';
import {
  REL_STATUS_ADD,
  REL_STATUS_NOOP,
  REL_STATUS_REMOVE,
} from '../constants';
import reducerWithErrorHandling
  from '../../edit/utility/reducerWithErrorHandling';
import type {
  FetchedTypeNameT,
  IncompleteRelationshipStateT,
  NonUrlRelationshipT,
  RelationshipPhraseGroupT,
  RelationshipTargetTypeGroupsT,
  RootActionT,
  RootDispatchT,
  SeededRelationshipT,
  WritableRelationshipPhraseGroupT,
} from '../types';
import compareRelationships, {
  COMPARE_ENTITY_CREDITS,
} from '../utility/compareRelationships';
import {
  exportLinkTypeInfo,
  exportLinkAttributeTypeInfo
} from '../utility/exportTypeInfo';
import getRelationshipEditStatus from '../utility/getRelationshipEditStatus';
import getRelationshipStateKey from '../utility/getRelationshipStateKey';
import updateRelationshipState, {
  DuplicateRelationshipError,
  createWritablePhraseGroup,
  getLinkPhrase,
  getRelationshipPath,
  getWritableRelationshipsArray,
} from '../utility/updateRelationshipState';

import RelationshipTargetTypeGroups from './RelationshipTargetTypeGroups';

export type PropsT = {
  +dispatch: RootDispatchT,
  +formName: string,
  +injectHiddenInputs: boolean,
  +state: StateT,
};

export type StateT = {
  +allLinkAttributeTypes: $ReadOnlyArray<LinkAttrTypeT> | null,
  +allLinkTypes: $ReadOnlyArray<LinkTypeT> | null,
  +reducerError: Error | null,
  +seededRelationships: ?$ReadOnlyArray<SeededRelationshipT>,
  +source: CoreEntityT,
  +submittedRelationships: RelationshipTargetTypeGroupsT | null,
  +targetTypeGroups: RelationshipTargetTypeGroupsT,
  +typeInfoLoadErrors: $ReadOnlyArray<string>,
  +typeInfoToLoad: Set<FetchedTypeNameT>,
};

/*
 * Adds any initial relationships -- those existing on the source
 * entity, plus any that were seeded -- to the state.
 *
 * Relationships are stored in the state as follows:
 *
 *   {                          // RelationshipTargetTypeGroupsT
 *      [targetEntityType]: [
 *         {                    // RelationshipPhraseGroupT
 *            relationships: [
 *              {...},          // IncompleteRelationshipStateT
 *            ],
 *            ...
 *         },
 *      ],
 *   }
 *
 * This structure matches how we display relationships in the
 * interface, so it means we don't have to group everything each
 * time there's a state update. It also means we can modify
 * relationships in a particular phrase group without affecting the
 * referential identity of other groups. This is important in
 * combination with `React.memo`.
 *
 * `addInitialRelationshipsToState` can only run once LinkType and
 * LinkAttributeType info has been loaded from /ws/js/type-info.
 */

function addInitialRelationshipsToState(
  state: {...StateT},
): void {
  const {
    source,
    seededRelationships,
    submittedRelationships,
  } = state;

  let targetTypeGroups = submittedRelationships;
  if (!targetTypeGroups) {
    const newTargetTypeGroups: {
      __proto__: null,
      [targetType: NonUrlCoreEntityTypeT]:
        Array<WritableRelationshipPhraseGroupT>,
    } = Object.create(null);

    for (let i = 0; i < NON_URL_RELATABLE_ENTITIES.length; i++) {
      const entityType = NON_URL_RELATABLE_ENTITIES[i];
      newTargetTypeGroups[entityType] = [];
    }

    if (source.relationships) {
      for (const relationship of source.relationships) {
        if (relationship.target_type !== 'url') {
          pushRelationship(
            newTargetTypeGroups,
            // $FlowIgnore[incompatible-cast]
            (relationship: NonUrlRelationshipT),
            source,
          );
        }
      }
    }

    if (seededRelationships) {
      for (const relationship of seededRelationships) {
        // $FlowIgnore[incompatible-type]
        if (relationship.target_type !== 'url') {
          pushRelationship(newTargetTypeGroups, relationship, source);
        }
      }
    }

    for (const targetType of Object.keys(newTargetTypeGroups)) {
      const phraseGroups = newTargetTypeGroups[targetType];
      for (const phraseGroup of phraseGroups) {
        phraseGroup.relationships.sort((a, b) => (
          compareRelationships(source, a, b, COMPARE_ENTITY_CREDITS)
        ));
      }
      phraseGroups.sort(cmpPhraseGroupLinkTypeInfo);
    }

    targetTypeGroups = newTargetTypeGroups;
  }

  state.targetTypeGroups = targetTypeGroups;
  state.seededRelationships = null;
  state.submittedRelationships = null;
}

function moveRelationship(
  newState: {...StateT},
  relationship: IncompleteRelationshipStateT,
  getNextIndex: (number) => number,
): void {
  const newTargetTypeGroups = {...newState.targetTypeGroups};

  const [
    exists,
    targetType,
    phraseGroupIndex,
    index,
  ] = getRelationshipPath(
    newTargetTypeGroups,
    relationship,
    newState.source,
  );

  invariant(exists, 'relationship to be moved not found');
  invariant(targetType);

  const relationships = getWritableRelationshipsArray(
    newTargetTypeGroups,
    targetType,
    phraseGroupIndex,
  );

  const nextLogicalLinkOrder =
    Math.max(0, getNextIndex(relationship.linkOrder));
  const nextIndex = getNextIndex(index);
  const nextRelationship: ?IncompleteRelationshipStateT =
    relationships[nextIndex];
  const nextLinkOrder = nextRelationship?.linkOrder;
  const newRelationship: {...IncompleteRelationshipStateT} =
    relationships[index] = {...relationship};

  if (
    nextRelationship &&
    nextLinkOrder != null &&
    nextLinkOrder === nextLogicalLinkOrder
  ) {
    const newNextRelationship: {...IncompleteRelationshipStateT} =
      relationships[nextIndex] = {...nextRelationship};

    newNextRelationship.linkOrder = newRelationship.linkOrder;
    newRelationship.linkOrder = nextLinkOrder;

    // $FlowIgnore[sketchy-null-number]
    if (newNextRelationship.id) {
      newNextRelationship._status = getRelationshipEditStatus(
        newState.source,
        newNextRelationship,
      );
    }

    const oldCmp = compareRelationships(
      newState.source,
      relationship,
      nextRelationship,
      COMPARE_ENTITY_CREDITS,
    );
    const newCmp = compareRelationships(
      newState.source,
      newRelationship,
      newNextRelationship,
      COMPARE_ENTITY_CREDITS,
    );

    if ((oldCmp > 0) !== (newCmp > 0)) {
      relationships[index] = newNextRelationship;
      relationships[nextIndex] = newRelationship;
    }
  } else {
    newRelationship.linkOrder = nextLogicalLinkOrder;
  }

  // $FlowIgnore[sketchy-null-number]
  if (newRelationship.id) {
    newRelationship._status = getRelationshipEditStatus(
      newState.source,
      newRelationship,
    );
  }

  newState.targetTypeGroups = newTargetTypeGroups;
}

function pushRelationship(
  targetTypeGroups,
  relationship,
  source,
) {
  const relationshipState: IncompleteRelationshipStateT = {
    ...relationship,
    _key: getRelationshipStateKey(relationship),
    // $FlowIgnore[sketchy-null-number]
    _original: relationship.id ? relationship : null,
    // $FlowIgnore[sketchy-null-number]
    _status: relationship.id ? REL_STATUS_NOOP : REL_STATUS_ADD,
  };

  const targetType = relationshipState.target_type;
  invariant(targetType);

  const phraseGroups = targetTypeGroups[targetType];
  const linkPhrase = getLinkPhrase(relationshipState);

  const [phraseGroupIndex, phraseGroupExists] = sortedIndexWith(
    phraseGroups,
    {
      backward: relationshipState.backward,
      textPhrase: linkPhrase,
      typeId: relationshipState.linkTypeID,
    },
    cmpPhraseGroupLinkTypeInfo,
  );

  let phraseGroup;
  if (phraseGroupExists) {
    phraseGroup = phraseGroups[phraseGroupIndex];
  } else {
    phraseGroup = createWritablePhraseGroup(
      linkPhrase,
      relationshipState,
      source,
    );
    phraseGroups.splice(phraseGroupIndex, 0, phraseGroup);
  }

  phraseGroup.relationships.push(relationshipState);
}

export const reducer: (
  StateT,
  RootActionT,
) => StateT = reducerWithErrorHandling((
  state,
  action,
) => {
  const newState = {...state, reducerError: null};

  switch (action.type) {
    case 'accept-relationship-dialog': {
      const {
        relationship,
        newRelationshipState,
      } = action;

      const relationshipDidChange = compareRelationships(
        state.source,
        relationship,
        newRelationshipState,
        COMPARE_ENTITY_CREDITS,
      );
      if (relationshipDidChange) {
        newState.targetTypeGroups = updateRelationshipState(
          newState.targetTypeGroups,
          relationship,
          newRelationshipState,
          state.source,
        );
      }

      break;
    }

    case 'remove-relationship': {
      const relationship = action.relationship;
      const origRelationship = relationship._original;

      newState.targetTypeGroups = updateRelationshipState(
        newState.targetTypeGroups,
        relationship,
        origRelationship ? {
          ...relationship,
          ...origRelationship,
          // Clicking the `x` again undoes the removal.
          _status: relationship._status === REL_STATUS_REMOVE
            ? REL_STATUS_NOOP
            : REL_STATUS_REMOVE,
        } : null,
        newState.source,
      );
      break;
    }

    case 'move-relationship-down': {
      moveRelationship(
        newState,
        action.relationship,
        x => x + 1,
      );
      break;
    }

    case 'move-relationship-up': {
      moveRelationship(
        newState,
        action.relationship,
        x => x - 1,
      );
      break;
    }

    case 'toggle-ordering': {
      const {hasOrdering, targetType} = action;
      const newTargetTypeGroups = {...newState.targetTypeGroups};
      const phraseGroups = newTargetTypeGroups[targetType];

      const [phraseGroupIndex, phraseGroupExists] = sortedIndexWith(
        phraseGroups,
        action.phraseGroup,
        cmpPhraseGroupLinkTypeInfo,
      );
      invariant(phraseGroupExists);

      const newPhraseGroups = phraseGroups.slice(0);
      const newPhraseGroup: {...RelationshipPhraseGroupT} =
        {...phraseGroups[phraseGroupIndex]};
      newPhraseGroups.splice(phraseGroupIndex, 1, newPhraseGroup);

      const relationships: Array<IncompleteRelationshipStateT> =
        newPhraseGroup.relationships =
        [...newPhraseGroup.relationships];

      let nextLogicalLinkOrder = 1;

      for (let i = 0; i < relationships.length; i++) {
        const relationship: {...IncompleteRelationshipStateT} =
          relationships[i] =
          {...relationships[i]};

        relationship.linkOrder =
          hasOrdering ? (nextLogicalLinkOrder++) : 0;

        // $FlowIgnore[sketchy-null-number]
        if (relationship.id) {
          relationship._status = getRelationshipEditStatus(
            newState.source,
            relationship,
          );
        }
      }

      relationships.sort((a, b) => (
        compareRelationships(newState.source, a, b, COMPARE_ENTITY_CREDITS)
      ));

      newTargetTypeGroups[targetType] = newPhraseGroups;
      newState.targetTypeGroups = newTargetTypeGroups;
      break;
    }

    case 'set-type-info': {
      switch (action.typeName) {
        case 'link_attribute_type': {
          newState.allLinkAttributeTypes = action.typeInfo;
          exportLinkAttributeTypeInfo(newState.allLinkAttributeTypes);
          break;
        }
        case 'link_type': {
          newState.allLinkTypes = action.typeInfo;
          exportLinkTypeInfo(newState.allLinkTypes);
          break;
        }
        case 'series_type': {
          linkedEntities.series_type =
            keyBy(action.typeInfo, type => String(type.id));
          break;
        }
      }

      newState.typeInfoToLoad =
        new Set(newState.typeInfoToLoad);
      newState.typeInfoToLoad.delete(action.typeName);

      if (!newState.typeInfoToLoad.size) {
        addInitialRelationshipsToState(newState);
      }

      break;
    }

    case 'set-type-info-error': {
      newState.typeInfoLoadErrors = [
        ...newState.typeInfoLoadErrors,
        action.error.message,
      ];
      break;
    }

    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  if (__DEV__) {
    deepFreeze(newState);
  }

  return newState;
});

function prepareSubmission(
  formName: string,
  targetTypeGroups: RelationshipTargetTypeGroupsT,
): void {
  const hiddenInputs = document.createDocumentFragment();
  let fieldCount = 0;

  const pushInput = (
    prefix: string,
    name: string,
    value: string,
  ): void => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = prefix + '.' + name;
    input.value = value;
    hiddenInputs.appendChild(input);
    ++fieldCount;
  };

  const page = document.getElementById('page');
  invariant(page);

  const submitButton: HTMLButtonElement | null =
    // $FlowIgnore[incompatible-type]
    page.querySelector('button[type=submit');
  if (submitButton) {
    submitButton.disabled = true;
  }

  const relationshipEditorContainer =
    document.getElementById('relationship-editor');
  invariant(relationshipEditorContainer);

  const existingHiddenInputs =
    relationshipEditorContainer.querySelectorAll('input[type=hidden]');

  for (const input of existingHiddenInputs) {
    relationshipEditorContainer.removeChild(input);
  }

  let relIndex = 0;
  for (const targetType of NON_URL_RELATABLE_ENTITIES) {
    const targetTypeGroup = targetTypeGroups[targetType];

    for (const phraseGroup of targetTypeGroup) {
      for (const relationship of phraseGroup.relationships) {
        if (relationship._status === REL_STATUS_NOOP) {
          continue;
        }
        pushRelationshipHiddenInputs(
          formName,
          relationship,
          relIndex++,
          pushInput,
        );
      }
    }
  }

  if (hasSessionStorage) {
    window.sessionStorage.setItem(
      'submittedRelationships',
      JSON.stringify(targetTypeGroups),
    );
  }

  const externalLinksEditor = MB.sourceExternalLinksEditor;
  if (externalLinksEditor) {
    externalLinksEditor.getFormData(formName + '.url', fieldCount, pushInput);

    const links = externalLinksEditor.state.links;
    if (hasSessionStorage && links.length) {
      window.sessionStorage.setItem('submittedLinks', JSON.stringify(links));
    }
  }

  document.getElementById('relationship-editor')?.appendChild(hiddenInputs);
}

function pushRelationshipHiddenInputs(
  formName: string,
  relationship: IncompleteRelationshipStateT,
  index: number,
  pushInput: (string, string, string) => void,
): void {
  const relPrefix = formName + '.rel.' + index;

  if (relationship.id != null) {
    pushInput(relPrefix, 'relationship_id', '' + relationship.id);
  }

  if (relationship._status === REL_STATUS_REMOVE) {
    pushInput(relPrefix, 'removed', '1');
  }

  if (relationship.target) {
    pushInput(relPrefix, 'target', relationship.target.gid);
  }

  const pushAttributeInputs = (
    index: number,
    attribute: LinkAttrT,
    removed?: boolean = false,
  ) => {
    const attrPrefix = relPrefix + '.attributes.' + index;

    pushInput(attrPrefix, 'type.gid', attribute.type.gid);

    if (removed) {
      pushInput(attrPrefix, 'removed', '1');
    } else {
      if (attribute.credited_as != null) {
        pushInput(attrPrefix, 'credited_as', attribute.credited_as);
      }
      if (attribute.text_value != null) {
        pushInput(attrPrefix, 'text_value', attribute.text_value);
      }
    }
  };

  const origRelationship = relationship._original;
  if (origRelationship) {
    const newIds = new Set<string>();
    const origAttributes = keyBy(
      origRelationship.attributes,
      x => '' + x.typeID,
    );
    const newAttributes = relationship.attributes;

    let index = 0;
    for (; index < newAttributes.length; index++) {
      const attribute = newAttributes[index];
      const id = '' + attribute.typeID;

      newIds.add(id);

      const origAttribute = origAttributes[id];
      if (!(
        origAttribute &&
        /* eslint-disable eqeqeq */
        origAttribute.credited_as == attribute.credited_as &&
        origAttribute.text_value == attribute.text_value
        /* eslint-enable eqeqeq */
      )) {
        pushAttributeInputs(index, attribute);
      }
    }

    for (
      const [origId, attribute] of
      // $FlowIssue[incompatible-cast]
      (Object.entries(origAttributes): $ReadOnlyArray<[string, LinkAttrT]>)
    ) {
      if (!newIds.has(origId)) {
        pushAttributeInputs(index++, attribute, true /* removed */);
      }
    }
  } else {
    const newAttributes = relationship.attributes;

    for (let index = 0; index < newAttributes.length; index++) {
      pushAttributeInputs(index, newAttributes[index]);
    }
  }

  if (relationship.entity0_credit) {
    pushInput(relPrefix, 'entity0_credit', relationship.entity0_credit);
  }

  if (relationship.entity1_credit) {
    pushInput(relPrefix, 'entity1_credit', relationship.entity1_credit);
  }

  const beginDate = relationship.begin_date;
  const endDate = relationship.end_date;

  pushInput(
    relPrefix,
    'period.begin_date.year',
    '' + (beginDate?.year ?? ''),
  );
  pushInput(
    relPrefix,
    'period.begin_date.month',
    '' + (beginDate?.month ?? ''),
  );
  pushInput(relPrefix, 'period.begin_date.day', '' + (beginDate?.day ?? ''));
  pushInput(relPrefix, 'period.end_date.year', '' + (endDate?.year ?? ''));
  pushInput(relPrefix, 'period.end_date.month', '' + (endDate?.month ?? ''));
  pushInput(relPrefix, 'period.end_date.day', '' + (endDate?.day ?? ''));
  pushInput(relPrefix, 'period.ended', relationship.ended ? '1' : '0');
  pushInput(relPrefix, 'backward', relationship.backward ? '1' : '0');

  const linkTypeId = relationship.linkTypeID;
  if (linkTypeId != null) {
    pushInput(relPrefix, 'link_type_id', '' + linkTypeId);

    const linkType = linkedEntities.link_type[linkTypeId];
    if (linkType.orderable_direction !== 0) {
      pushInput(relPrefix, 'link_order', '' + relationship.linkOrder);
    }
  }
}

const RelationshipEditor = (
  props: PropsT,
): React.Element<'fieldset'> | null => {
  const {
    dispatch,
    formName,
    injectHiddenInputs,
    state,
  } = props;

  const reducerError = state.reducerError;

  const submissionInProgress = React.useRef(false);

  React.useEffect(() => {
    if (injectHiddenInputs) {
      const handleSubmission = () => {
        if (!submissionInProgress.current) {
          submissionInProgress.current = true;
          prepareSubmission(
            formName,
            state.targetTypeGroups,
          );
        }
      };

      document.addEventListener('submit', handleSubmission);

      return () => {
        document.removeEventListener('submit', handleSubmission);
      };
    }

    return undefined;
  });

  return (
    <fieldset id="relationship-editor">
      {reducerError ? (
        <div className="error">
          {reducerError instanceof DuplicateRelationshipError ? (
            l(`The relationship you’ve attempted to add already exists.`)
          ) : (
            <>
              <strong className="error">
                {l('Oops, something went wrong!')}
              </strong>
              <br />
              <pre style={{whiteSpace: 'pre-wrap'}}>
                {reducerError.stack}
              </pre>
            </>
          )}
        </div>
      ) : null}

      {state.typeInfoToLoad.size ? (
        state.typeInfoLoadErrors.length ? (
          <ul className="errors">
            {state.typeInfoLoadErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ) : null
      ) : (
        <RelationshipTargetTypeGroups
          dispatch={dispatch}
          source={state.source}
          targetTypeGroups={state.targetTypeGroups}
        />
      )}
    </fieldset>
  );
};

export default RelationshipEditor;
