/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import Autocomplete2 from '../../../common/components/Autocomplete2';
import {
  default as autocompleteReducer,
} from '../../../common/components/Autocomplete2/reducer';
import type {
  Actions as AutocompleteActionT,
  Props as AutocompletePropsT,
  State as AutocompleteStateT,
} from '../../../common/components/Autocomplete2/types';

/* eslint-disable flowtype/sort-keys */
export type ActionT =
  | {+type: 'remove'}
  | {
      +type: 'update-autocomplete',
      +action: AutocompleteActionT<LinkAttrTypeT>,
    }
  | {+type: 'set-credit', +creditedAs: string};
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +dispatch: (valueKey: number, action: ActionT) => void,
  +state: StateT,
};

export type StateT = {
  +control: 'multiselect-value',
  +creditedAs?: string,
  +error?: string,
  +key: number,
  +removed: boolean,
  +typeAutocomplete: AutocompleteStateT<LinkAttrTypeT>,
};

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  switch (action.type) {
    case 'remove': {
      return {...state, removed: true};
    }
    case 'update-autocomplete': {
      const newState: {...StateT} = {...state};
      newState.typeAutocomplete = autocompleteReducer<LinkAttrTypeT>(
        newState.typeAutocomplete,
        action.action,
      );
      return newState;
    }
    case 'set-credit': {
      return {
        ...state,
        creditedAs: action.creditedAs,
      };
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }
}

// XXX Until Flow supports https://github.com/facebook/flow/issues/7672
const LinkAttrTypeAutocomplete:
  React$AbstractComponent<AutocompletePropsT<LinkAttrTypeT>, void> =
  (Autocomplete2: any);

const MultiselectAttribute = (React.memo<PropsT>(({
  dispatch,
  state,
}: PropsT): React.MixedElement => {
  const autocomplete = state.typeAutocomplete;
  const attributeType = autocomplete.selectedEntity;

  const autocompleteDispatch = React.useCallback((action) => {
    dispatch(state.key, {
      action,
      type: 'update-autocomplete',
    });
  }, [dispatch, state.key]);

  function handleCreditChange(event) {
    dispatch(state.key, {
      creditedAs: event.target.value,
      type: 'set-credit',
    });
  }

  return (
    <div key={state.key}>
      {/*
        * Removed entries are kept in the list so that focus isn't
        * lost and/or doesn't need to be shifted to an unrelated row;
        * neither situation is accessible.
        */}
      {state.removed ? (
        l('[removed]')
      ) : (
        <>
          <LinkAttrTypeAutocomplete
            {...autocomplete}
            dispatch={autocompleteDispatch}
          />
          <input
            className="attribute-credit"
            disabled={!attributeType?.creditable}
            onChange={handleCreditChange}
            placeholder={l('credited as')}
            type="text"
            value={state.creditedAs ?? ''}
          />
        </>
      )}
      <button
        className="icon remove-item"
        onClick={() => {
          dispatch(state.key, {type: 'remove'});
        }}
        type="button"
      />
    </div>
  );
}): React.AbstractComponent<PropsT, mixed>);

export default MultiselectAttribute;
