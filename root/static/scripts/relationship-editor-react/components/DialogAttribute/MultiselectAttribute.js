/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import {
  createInitialState as createAutocompleteState,
} from '../../../common/components/Autocomplete2';
import type {
  OptionItem,
} from '../../../common/components/Autocomplete2/types';
import {
  INSTRUMENT_ROOT_ID,
  VOCAL_ROOT_ID,
} from '../../../common/constants';
import localizeLinkAttributeTypeName
  from '../../../common/i18n/localizeLinkAttributeTypeName';
import type {
  AttributeStateT,
} from '../../types';
import autocompleteTypeFilter from '../../utility/autocompleteTypeFilter';
import getAttributeKey from '../../utility/getAttributeKey';

import MultiselectAttributeValue, {
  type ActionT as AttributeValueActionT,
  type StateT as ValueStateT,
  reducer as attributeValueReducer,
} from './MultiselectAttributeValue';

const addAnotherAttributeLabels = {
  [INSTRUMENT_ROOT_ID]: N_l('Add another instrument'),
  [VOCAL_ROOT_ID]: N_l('Add another vocal'),
};

/* eslint-disable flowtype/sort-keys */
export type ActionT =
  | {+type: 'add-value'}
  | {
      +type: 'update-value',
      +action: AttributeValueActionT,
      +valueKey: number,
    };
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +dispatch: (rootKey: number, action: ActionT) => void,
  +state: StateT,
};

export type StateT = $ReadOnly<{
  ...AttributeStateT,
  +control: 'multiselect',
  +linkType: LinkTypeT,
  +values: $ReadOnlyArray<ValueStateT>,
}>;

function _createLinkAttributeTypeOptions(
  attr: LinkAttrTypeT,
  level: number = 0,
  result: Array<OptionItem<LinkAttrTypeT>> = [],
) {
  if (level >= 0) {
    result.push({
      entity: attr,
      id: attr.id,
      level,
      name: attr.name,
      type: 'option',
    });
  }
  attr.children?.forEach(child => (
    void _createLinkAttributeTypeOptions(child, level + 1, result)
  ));
}

/*
 * Flattens a root attribute type plus its children into a single list
 * for the autocomplete component. Sets a `level` property on each item
 * which is used by the autocomplete for visual indentation.
 */
const linkAttributeTypeOptionsCache = new Map();
const createLinkAttributeTypeOptions = (
  rootAttributeType: LinkAttrTypeT,
) => {
  const rootId = rootAttributeType.id;
  let options = linkAttributeTypeOptionsCache.get(rootId);
  if (options) {
    return options;
  }
  options = [];
  _createLinkAttributeTypeOptions(rootAttributeType, -1, options);
  linkAttributeTypeOptionsCache.set(rootId, options);
  return options;
};

export function createMultiselectAttributeValue(
  rootAttribute: LinkAttrTypeT,
  selectedAttribute: LinkAttrTypeT | null,
  creditedAs?: string = '',
): ValueStateT {
  const key = getAttributeKey();
  return {
    control: 'multiselect-value',
    creditedAs,
    key,
    removed: false,
    typeAutocomplete: createAutocompleteState<LinkAttrTypeT>({
      entityType: 'link_attribute_type',
      id: 'attribute-' + String(key),
      placeholder: localizeLinkAttributeTypeName(rootAttribute),
      recentItemsKey: 'link_attribute_type-' + rootAttribute.name,
      selectedEntity: selectedAttribute,
      staticItems: createLinkAttributeTypeOptions(rootAttribute),
      staticItemsFilter: autocompleteTypeFilter,
    }),
  };
}

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  const newState: {...StateT} = {...state};

  switch (action.type) {
    case 'add-value': {
      newState.values = [
        ...newState.values,
        createMultiselectAttributeValue(newState.type, null),
      ];
      break;
    }
    case 'update-value': {
      newState.values = newState.values.map((x) => {
        if (x.key === action.valueKey) {
          return attributeValueReducer(x, action.action);
        }
        return x;
      });
      break;
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  const rootInfo = newState.linkType.attributes[newState.type.id];
  if (
    rootInfo.min &&
    rootInfo.min > newState.values.filter(x => !x.removed).length
  ) {
    newState.error = l('This attribute is required.');
  } else {
    newState.error = '';
  }

  return newState;
}

const MultiselectAttribute = (React.memo<PropsT>(({
  state,
  dispatch,
}: PropsT): React.MixedElement => {
  const linkTypeAttributeType = state.type;
  const addLabel = addAnotherAttributeLabels[linkTypeAttributeType.id];

  const handleAdd = React.useCallback(() => {
    dispatch(state.key, {type: 'add-value'});
  }, [dispatch, state.key]);

  const valueDispatch = React.useCallback((valueKey, action) => {
    dispatch(state.key, {
      action,
      type: 'update-value',
      valueKey,
    });
  }, [dispatch, state.key]);

  return (
    <>
      {addColonText(state.type.l_name ?? '')}
      {' '}
      {state.values.map(valueAttribute => {
        return (
          <MultiselectAttributeValue
            dispatch={valueDispatch}
            key={valueAttribute.key}
            state={valueAttribute}
          />
        );
      })}

      {(state.max == null || state.max > 1) ? (
        <button
          className="add-item with-label"
          onClick={handleAdd}
          type="button"
        >
          {' ' + (addLabel ? addLabel() : '')}
        </button>
      ) : null}
    </>
  );
}): React.AbstractComponent<PropsT, mixed>);

export default MultiselectAttribute;
