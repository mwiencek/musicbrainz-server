/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import {
  filterStaticItems,
  resetPage as resetAutocompletePage,
} from '../../common/components/Autocomplete2/reducer';
import linkedEntities from '../../common/linkedEntities';
import DateRangeFieldset, {
  partialDateFromField,
  reducer as dateRangeFieldsetReducer,
  type ActionT as DateRangeFieldsetActionT,
} from '../../edit/components/DateRangeFieldset';
import {
  createCompoundField,
  createField,
} from '../../edit/utility/createField';
import type {
  LinkAttributesByRootIdT,
  IncompleteRelationshipStateT,
  RootActionT,
} from '../types';
import getCompleteRelationshipState
  from '../utility/getCompleteRelationshipState';
import getDialogLinkTypeOptions from '../utility/getDialogLinkTypeOptions';
import getRelationshipEditStatus from '../utility/getRelationshipEditStatus';
import getRelationshipLinkType from '../utility/getRelationshipLinkType';
import {type TargetTypeOptionsT} from '../utility/getTargetTypeOptions';

import DialogAttributes, {
  type ActionT as DialogAttributesActionT,
  type StateT as DialogAttributesStateT,
  createDialogAttributesList,
  getLinkAttributesFromState,
  createInitialState as createDialogAttributesState,
  reducer as dialogAttributesReducer,
} from './DialogAttributes';
import DialogButtons from './DialogButtons';
import DialogLinkType, {
  type ActionT as DialogLinkTypeActionT,
  type StateT as DialogLinkTypeStateT,
  createInitialState as createDialogLinkTypeState,
  reducer as dialogLinkTypeReducer,
} from './DialogLinkType';
import DialogPreview from './DialogPreview';
import DialogSourceEntity, {
  type ActionT as DialogSourceEntityActionT,
  type StateT as DialogSourceEntityStateT,
  createInitialState as createDialogSourceEntityState,
  reducer as dialogSourceEntityReducer,
} from './DialogSourceEntity';
import DialogTargetEntity, {
  type ActionT as DialogTargetEntityActionT,
  type StateT as DialogTargetEntityStateT,
  createInitialState as createDialogTargetEntityState,
  reducer as dialogTargetEntityReducer,
} from './DialogTargetEntity';

/* eslint-disable flowtype/sort-keys */
export type ActionT =
  | {+type: 'change-direction'}
  | {+type: 'update-source-entity', +action: DialogSourceEntityActionT}
  | {
      +type: 'update-target-entity',
      +action: DialogTargetEntityActionT,
      +source: CoreEntityT,
    }
  | {+type: 'update-link-type', +action: DialogLinkTypeActionT}
  | {+type: 'update-attributes', +action: DialogAttributesActionT}
  | {+type: 'update-date-period', +action: DateRangeFieldsetActionT};
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +closeDialog: () => void,
  +relationship: IncompleteRelationshipStateT,
  +rootDispatch: (RootActionT) => void,
  +source: CoreEntityT,
  +targetTypeOptions: TargetTypeOptionsT,
  +targetTypeRef?: {-current: NonUrlCoreEntityTypeT},
  +targetTypeSelectRef: {current: HTMLSelectElement | null},
  +title: string,
  +user: ActiveEditorT,
};

export type StateT = {
  +attributes: DialogAttributesStateT,
  +backward: boolean,
  +datePeriodField: DatePeriodFieldT,
  +linkType: DialogLinkTypeStateT,
  +resultingDatePeriod: DatePeriodRoleT,
  +sourceEntity: DialogSourceEntityStateT,
  +targetEntity: DialogTargetEntityStateT,
  +targetTypeRef?: {-current: NonUrlCoreEntityTypeT},
};

export function createInitialState(props: PropsT): StateT {
  const relationship = props.relationship;
  const linkType = getRelationshipLinkType(relationship);
  const beginDate = relationship.begin_date;
  const endDate = relationship.end_date;

  function accumulateRelationshipLinkAttributeByRootId(
    result,
    linkAttribute,
  ) {
    const attributeType =
      linkedEntities.link_attribute_type[linkAttribute.typeID];
    invariant(attributeType);
    const rootId = attributeType.root_id;

    (result[rootId] ?? (result[rootId] = [])).push({
      credited_as: linkAttribute.credited_as,
      text_value: linkAttribute.text_value,
      type: attributeType,
    });
    return result;
  }

  if (__DEV__) {
    invariant(props.targetTypeOptions.length);
  }

  const targetType =
    relationship.target_type ?? (props.targetTypeOptions[0].value);

  return {
    attributes: createDialogAttributesState(
      linkType,
      relationship.attributes.reduce<LinkAttributesByRootIdT>(
        accumulateRelationshipLinkAttributeByRootId,
        Object.create(null),
      ),
    ),
    backward: relationship.backward,
    datePeriodField: createCompoundField('period', {
      begin_date: createCompoundField(
        'period.begin_date',
        {
          day: createField(
            'period.begin_date.day',
            (beginDate?.day ?? null),
          ),
          month: createField(
            'period.begin_date.month',
            (beginDate?.month ?? null),
          ),
          year: createField(
            'period.begin_date.year',
            (beginDate?.year ?? null),
          ),
        },
      ),
      end_date: createCompoundField(
        'period.end_date',
        {
          day: createField(
            'period.end_date.day',
            (endDate?.day ?? null),
          ),
          month: createField(
            'period.end_date.month',
            (endDate?.month ?? null),
          ),
          year: createField(
            'period.end_date.year',
            (endDate?.year ?? null),
          ),
        },
      ),
      ended: createField('period.ended', relationship.ended),
    }),
    linkType: createDialogLinkTypeState(
      relationship,
      props.source.entityType,
      targetType,
      getDialogLinkTypeOptions(props.source, targetType),
    ),
    resultingDatePeriod: {
      begin_date: relationship.begin_date,
      end_date: relationship.end_date,
      ended: relationship.ended,
    },
    sourceEntity: createDialogSourceEntityState(relationship),
    targetEntity: createDialogTargetEntityState(
      props.user,
      props.source,
      targetType,
      relationship,
    ),
    targetTypeRef: props.targetTypeRef,
  };
}

function accumulateDialogAttributeByRootId(
  result,
  dialogAttribute,
) {
  const root = dialogAttribute.type;
  const rootId = root.id;

  invariant(rootId === root.root_id);

  const children = result[rootId] ?? (result[rootId] = []);

  if (dialogAttribute.control === 'multiselect') {
    for (const valueAttribute of dialogAttribute.values) {
      if (valueAttribute.removed) {
        continue;
      }
      children.push({
        credited_as: valueAttribute.creditedAs,
        type: valueAttribute.typeAutocomplete.selectedEntity,
      });
    }
  } else {
    children.push({
      credited_as: dialogAttribute.creditedAs,
      text_value: dialogAttribute.control === 'text'
        ? dialogAttribute.textValue
        : '',
      type: dialogAttribute.type,
    });
  }

  return result;
}

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  const newState: {...StateT} = {...state};

  switch (action.type) {
    case 'change-direction': {
      newState.backward = !state.backward;
      break;
    }

    case 'update-source-entity': {
      newState.sourceEntity =
        dialogSourceEntityReducer(newState.sourceEntity, action.action);
      break;
    }

    case 'update-target-entity': {
      newState.targetEntity =
        dialogTargetEntityReducer(newState.targetEntity, action.action);

      const oldTargetType = state.targetEntity.autocomplete.entityType;
      const newTargetType = newState.targetEntity.autocomplete.entityType;

      if (oldTargetType !== newTargetType) {
        const source = action.source;
        const sourceType = source.entityType;
        const newLinkTypeOptions = getDialogLinkTypeOptions(
          source,
          newTargetType,
        );

        const newLinkTypeAutocompleteState = {
          ...newState.linkType.autocomplete,
          recentItems: null,
          recentItemsKey: 'link_type-' + sourceType + '-' + newTargetType,
          results: newLinkTypeOptions,
          selectedEntity: null,
          staticItems: newLinkTypeOptions,
        };
        filterStaticItems<LinkTypeT>(
          newLinkTypeAutocompleteState,
          newLinkTypeAutocompleteState.inputValue,
        );
        resetAutocompletePage<LinkTypeT>(newLinkTypeAutocompleteState);

        newState.linkType = {
          ...newState.linkType,
          autocomplete: newLinkTypeAutocompleteState,
        };

        if (oldTargetType === sourceType) {
          // type0/type1 are always ordered alphabetically
          newState.backward = sourceType > newTargetType;
        } else if (newTargetType === sourceType) {
          newState.backward = false;
        }
      }

      /*
       * Save the currently-selected target type so that it can be
       * pre-selected in the future.
       */
      if (newState.targetTypeRef) {
        newState.targetTypeRef.current = newTargetType;
      }
      break;
    }

    case 'update-link-type': {
      newState.linkType =
        dialogLinkTypeReducer(newState.linkType, action.action);

      const oldLinkType = state.linkType.autocomplete.selectedEntity;
      const newLinkType = newState.linkType.autocomplete.selectedEntity;

      if (oldLinkType !== newLinkType) {
        const newAttributesList = createDialogAttributesList(
          newLinkType,
          newState.attributes.attributesList
            .reduce<LinkAttributesByRootIdT>(
              accumulateDialogAttributeByRootId,
              Object.create(null),
            ),
        );
        newState.attributes = {
          ...newState.attributes,
          attributesList: newAttributesList,
          resultingLinkAttributes: getLinkAttributesFromState(
            newAttributesList,
          ),
        };
      }

      break;
    }

    case 'update-attributes': {
      newState.attributes = dialogAttributesReducer(
        newState.attributes,
        action.action,
      );
      break;
    }

    case 'update-date-period': {
      const newDatePeriodField = dateRangeFieldsetReducer(
        newState.datePeriodField,
        action.action,
      );
      newState.datePeriodField = newDatePeriodField;

      newState.resultingDatePeriod = {
        begin_date: partialDateFromField(
          newDatePeriodField.field.begin_date,
        ),
        end_date: partialDateFromField(
          newDatePeriodField.field.end_date,
        ),
        ended: newDatePeriodField.field.ended.value,
      };
      break;
    }

    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  return newState;
}

const RelationshipDialogContent = (React.memo<PropsT>((
  props: PropsT,
): React.MixedElement => {
  const {
    closeDialog,
    relationship,
    rootDispatch,
    source,
    targetTypeOptions,
    targetTypeSelectRef,
    title,
  } = props;

  const [state, dispatch] = React.useReducer(
    reducer,
    props,
    createInitialState,
  );

  const backward = state.backward;
  const linkTypeState = state.linkType;
  const selectedLinkType = linkTypeState.autocomplete.selectedEntity;
  const targetEntityState = state.targetEntity;
  const selectedTargetEntity = targetEntityState.autocomplete.selectedEntity;
  const targetType = targetEntityState.autocomplete.entityType;

  const hasErrors = !!(
    linkTypeState.error ||
    targetEntityState.error ||
    state.attributes.attributesList.some(x => x.error) ||
    state.datePeriodField.pendingErrors?.length ||
    state.datePeriodField.field.begin_date.pendingErrors?.length ||
    state.datePeriodField.field.end_date.pendingErrors?.length
  );

  const newRelationshipState = React.useMemo(() => {
    if (hasErrors) {
      return null;
    }

    if (selectedTargetEntity) {
      const expectedType = targetEntityState.autocomplete.entityType;
      invariant(
        selectedTargetEntity.entityType === expectedType,
        'The selected entity does not have type "' + expectedType + '"',
      );
    }

    const newRelationship: {...IncompleteRelationshipStateT} = {
      ...relationship,
      ...state.resultingDatePeriod,
      attributes: state.attributes.resultingLinkAttributes,
      backward,
      entity0_credit: backward
        ? targetEntityState.creditedAs
        : state.sourceEntity.creditedAs,
      entity0_id: backward
        ? (selectedTargetEntity ? selectedTargetEntity.id : null)
        : source.id,
      entity1_credit: backward
        ? state.sourceEntity.creditedAs
        : targetEntityState.creditedAs,
      entity1_id: backward
        ? source.id
        : (selectedTargetEntity ? selectedTargetEntity.id : null),
      linkTypeID: selectedLinkType ? selectedLinkType.id : null,
      target: selectedTargetEntity,
      target_type: selectedTargetEntity
        ? selectedTargetEntity.entityType
        : null,
    };

    // $FlowIgnore[sketchy-null-number]
    if (newRelationship.id) {
      newRelationship._status = getRelationshipEditStatus(
        source,
        newRelationship,
      );
    }

    return getCompleteRelationshipState(newRelationship);
  }, [
    backward,
    hasErrors,
    relationship,
    selectedLinkType,
    selectedTargetEntity,
    source,
    state.attributes.resultingLinkAttributes,
    state.resultingDatePeriod,
    state.sourceEntity.creditedAs,
    targetEntityState.creditedAs,
    targetEntityState.autocomplete.entityType,
  ]);

  const acceptDialog = React.useCallback(() => {
    invariant(
      newRelationshipState &&
      selectedLinkType &&
      selectedTargetEntity,
    );

    invariant(
      backward
        ? (selectedLinkType.type0 === selectedTargetEntity.entityType &&
            selectedLinkType.type1 === source.entityType)
        : (selectedLinkType.type0 === source.entityType &&
            selectedLinkType.type1 === selectedTargetEntity.entityType),
      'The selected link type is invalid for these entity types',
    );

    rootDispatch({
      newRelationshipState,
      relationship,
      type: 'accept-relationship-dialog',
    });

    closeDialog();
  }, [
    backward,
    selectedLinkType,
    selectedTargetEntity,
    source.entityType,
    rootDispatch,
    relationship,
    newRelationshipState,
    closeDialog,
  ]);

  const sourceEntityDispatch = React.useCallback((action) => {
    dispatch({action, type: 'update-source-entity'});
  }, [dispatch]);

  const targetEntityDispatch = React.useCallback((action) => {
    dispatch({
      action,
      source,
      type: 'update-target-entity',
    });
  }, [dispatch, source]);

  const linkTypeDispatch = React.useCallback((action) => {
    dispatch({action, type: 'update-link-type'});
  }, [dispatch]);

  const attributesDispatch = React.useCallback((action) => {
    dispatch({action, type: 'update-attributes'});
  }, [dispatch]);

  const dateDispatch = React.useCallback((action) => {
    dispatch({action, type: 'update-date-period'});
  }, [dispatch]);

  const openEditsLink = (
    relationship._original &&
    relationship?.editsPending
  ) ? getOpenEditsLink(relationship._original, source) : null;

  return (
    <div className="form">
      <h1>{title}</h1>

      {openEditsLink == null ? null : (
        <p className="msg warning">
          {exp.l(
            `Warning: This relationship has pending edits. {show|Click here}
             to view these edits and make sure they do not conflict with
             your own.`,
            {
              show: {
                href: openEditsLink,
                target: '_blank',
              },
            },
          )}
        </p>
      )}
      <table className="relationship-details">
        <tbody>
          <DialogSourceEntity
            backward={backward}
            dispatch={sourceEntityDispatch}
            linkType={selectedLinkType}
            source={source}
            state={state.sourceEntity}
            targetType={targetType}
          />
          <DialogTargetEntity
            dispatch={targetEntityDispatch}
            linkType={selectedLinkType}
            options={targetTypeOptions}
            relationship={relationship}
            source={source}
            state={targetEntityState}
            targetTypeSelectRef={targetTypeSelectRef}
          />
          <DialogLinkType
            dispatch={linkTypeDispatch}
            source={source}
            state={linkTypeState}
          />
        </tbody>
      </table>
      <DialogAttributes
        dispatch={attributesDispatch}
        state={state.attributes}
      />
      {(selectedLinkType && selectedLinkType.has_dates) ? (
        <DateRangeFieldset
          collapsed
          dispatch={dateDispatch}
          endedLabel={l('This relationship has ended.')}
          field={state.datePeriodField}
        />
      ) : null}
      <DialogPreview
        backward={backward}
        dispatch={dispatch}
        newRelationship={newRelationshipState}
        oldRelationship={relationship._original}
        source={source}
      />
      <DialogButtons
        isDoneDisabled={hasErrors}
        onCancel={closeDialog}
        onDone={acceptDialog}
      />
    </div>
  );
}): React.AbstractComponent<PropsT>);

function getOpenEditsLink(relationship, source) {
  let entity0;
  let entity1;

  if (relationship.backward) {
    entity0 = relationship.target;
    entity1 = source;
  } else {
    entity0 = source;
    entity1 = relationship.target;
  }

  if (!entity0 || !entity1) {
    return null;
  }

  return (
    '/search/edits?auto_edit_filter=&order=desc&negation=0&combinator=and' +
    `&conditions.0.field=${encodeURIComponent(entity0.entityType)}` +
    '&conditions.0.operator=%3D' +
    `&conditions.0.name=${encodeURIComponent(entity0.name)}` +
    `&conditions.0.args.0=${encodeURIComponent(String(entity0.id))}` +
    `&conditions.1.field=${encodeURIComponent(entity1.entityType)}` +
    '&conditions.1.operator=%3D' +
    `&conditions.1.name=${encodeURIComponent(entity1.name)}` +
    `&conditions.1.args.0=${encodeURIComponent(String(entity1.id))}` +
    '&conditions.2.field=type' +
    '&conditions.2.operator=%3D&conditions.2.args=90%2C233' +
    '&conditions.2.args=91&conditions.2.args=92' +
    '&conditions.3.field=status&conditions.3.operator=%3D' +
    '&conditions.3.args=1&field=Please+choose+a+condition'
  );
}

export default RelationshipDialogContent;
