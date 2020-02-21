/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import Autocomplete2, {
  createInitialState as createInitialAutocompleteState,
} from '../../common/components/Autocomplete2';
import {default as autocompleteReducer}
  from '../../common/components/Autocomplete2/reducer';
import type {
  Actions as AutocompleteActionT,
  Props as AutocompletePropsT,
  State as AutocompleteStateT,
} from '../../common/components/Autocomplete2/types';
import {
  ENTITY_NAMES,
  ENTITIES_WITH_RELATIONSHIP_CREDITS,
  PART_OF_SERIES_LINK_TYPE_GIDS,
} from '../../common/constants';
import linkedEntities from '../../common/linkedEntities';
import type {
  IncompleteRelationshipStateT,
} from '../types';
import getRelationshipLinkType from '../utility/getRelationshipLinkType';
import {type TargetTypeOptionsT} from '../utility/getTargetTypeOptions';

import DialogEntityCredit, {
  type ActionT as EntityCreditActionT,
  type StateT as EntityCreditStateT,
  createInitialState as createDialogEntityCreditState,
  reducer as dialogEntityCreditReducer,
} from './DialogEntityCredit';

/* eslint-disable flowtype/sort-keys */
export type ActionT =
  | {
      +type: 'update-autocomplete',
      +action: AutocompleteActionT<NonUrlCoreEntityT>,
      +relationship: IncompleteRelationshipStateT,
      +source: CoreEntityT,
    }
  | {
      +type: 'update-credit',
      +action: EntityCreditActionT,
    };
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +dispatch: (ActionT) => void,
  +linkType: LinkTypeT | null,
  +options: TargetTypeOptionsT,
  +relationship: IncompleteRelationshipStateT,
  +source: CoreEntityT,
  +state: StateT,
  +targetTypeSelectRef: {current: HTMLSelectElement | null},
};

export type StateT = $ReadOnly<{
  ...EntityCreditStateT,
  +autocomplete: AutocompleteStateT<NonUrlCoreEntityT>,
  +error: string,
}>;

export function createInitialState(
  user: ActiveEditorT,
  source: CoreEntityT,
  targetType: NonUrlCoreEntityTypeT,
  relationship: IncompleteRelationshipStateT,
): StateT {
  const target = relationship.target;

  if (__DEV__) {
    const targetEntityType = (target?.entityType) ?? null;
    invariant(
      targetEntityType === relationship.target_type,
    );
    invariant(
      !targetEntityType || targetEntityType === targetType,
    );
  }

  return {
    ...createDialogEntityCreditState(
      relationship.backward
        ? relationship.entity0_credit
        : relationship.entity1_credit,
    ),
    autocomplete: createInitialAutocompleteState<NonUrlCoreEntityT>({
      entityType: targetType,
      id: 'relationship-target-' + String(relationship._key),
      inputValue: (target?.name) ?? '',
      selectedEntity: target,
    }),
    error: '',
  };
}

const INCORRECT_SERIES_ENTITY_MESSAGES = {
  event: N_l('The series you’ve selected is for events.'),
  recording: N_l('The series you’ve selected is for recordings.'),
  release: N_l('The series you’ve selected is for releases.'),
  release_group: N_l('The series you’ve selected is for release groups.'),
  work: N_l('The series you’ve selected is for works.'),
};

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  switch (action.type) {
    case 'update-autocomplete': {
      const newState: {...StateT} = {...state};

      newState.autocomplete = autocompleteReducer<NonUrlCoreEntityT>(
        newState.autocomplete,
        action.action,
      );

      const target = newState.autocomplete.selectedEntity;
      const {relationship, source} = action;
      let error = '';

      if (target) {
        if (source.gid === target.gid) {
          error = l('Entities in a relationship cannot be the same.');
        }

        if (target.entityType === 'series') {
          const seriesTypeId = target.typeID;
          if (!seriesTypeId) {
            throw new Error('Series must have a type set');
          }
          const seriesType = linkedEntities.series_type[String(seriesTypeId)];
          const seriesItemType = seriesType.item_entity_type;
          const linkType = getRelationshipLinkType(relationship);
          if (
            linkType &&
            PART_OF_SERIES_LINK_TYPE_GIDS.includes(linkType.gid) &&
            seriesItemType !== source.entityType
          ) {
            error = INCORRECT_SERIES_ENTITY_MESSAGES[seriesItemType]();
          }
        }
      } else {
        error = l('Required field.');
      }

      newState.error = error;
      return newState;
    }
    case 'update-credit': {
      return dialogEntityCreditReducer(
        state,
        action.action,
      );
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }
}

// XXX Until Flow supports https://github.com/facebook/flow/issues/7672
const TargetAutocomplete:
  React$AbstractComponent<AutocompletePropsT<NonUrlCoreEntityT>, void> =
  // $FlowIgnore[incompatible-type]
  Autocomplete2;

const DialogTargetEntity = (React.memo<PropsT>((
  props: PropsT,
): React.MixedElement => {
  const {
    dispatch,
    linkType,
    options,
    relationship,
    source,
    state,
    targetTypeSelectRef,
  } = props;

  const autocomplete = state.autocomplete;
  const target = autocomplete.selectedEntity;
  const targetType = autocomplete.entityType;

  function changeTargetType(event) {
    dispatch({
      action: {
        entityType: event.target.value,
        type: 'change-entity-type',
      },
      relationship,
      source,
      type: 'update-autocomplete',
    });
  }

  const autocompleteDispatch = React.useCallback((action) => {
    dispatch({
      action,
      relationship,
      source,
      type: 'update-autocomplete',
    });
  }, [dispatch, relationship, source]);

  const creditDispatch = React.useCallback((action) => {
    dispatch({action, type: 'update-credit'});
  }, [dispatch]);

  return (
    <>
      <tr>
        <td className="section">
          {addColonText(l('Related entity type'))}
        </td>
        <td>
          <select
            className="entity-type"
            disabled={relationship.id != null}
            onChange={changeTargetType}
            ref={targetTypeSelectRef}
            value={targetType}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.text}
              </option>
            ))}
          </select>
        </td>
      </tr>
      <tr>
        <td className="section">
          {addColonText(ENTITY_NAMES[targetType]())}
        </td>
        <td>
          <TargetAutocomplete
            {...autocomplete}
            dispatch={autocompleteDispatch}
          />
          <div className="error">
            {state.error}
          </div>
          {ENTITIES_WITH_RELATIONSHIP_CREDITS[targetType] && target ? (
            <DialogEntityCredit
              backward={relationship.backward}
              dispatch={creditDispatch}
              entity={target}
              linkType={linkType}
              state={state}
              targetType={source.entityType}
            />
          ) : null}
        </td>
      </tr>
    </>
  );
}): React.AbstractComponent<PropsT>);

export default DialogTargetEntity;
