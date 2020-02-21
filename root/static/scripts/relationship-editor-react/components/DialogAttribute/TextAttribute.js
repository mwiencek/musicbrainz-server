/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import type {
  AttributeStateT,
} from '../../types';

/* eslint-disable flowtype/sort-keys */
export type ActionT =
  | {+type: 'set-text-value', +textValue: string};
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +dispatch: (rootKey: number, action: ActionT) => void,
  +state: StateT,
};

export type StateT = $ReadOnly<{
  ...AttributeStateT,
  +control: 'text',
  +textValue: string,
}>;

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  const newState: {...StateT} = {...state};

  switch (action.type) {
    case 'set-text-value': {
      newState.textValue = action.textValue;
      break;
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  return newState;
}

const TextAttribute = (React.memo(({
  dispatch,
  state,
}) => (
  <label>
    {addColonText(state.type.l_name ?? '')}
    <br />
    <input
      onChange={(event) => {
        dispatch(state.key, {
          textValue: event.target.value,
          type: 'set-text-value',
        });
      }}
      type="text"
      value={state.textValue}
    />
  </label>
)): React.AbstractComponent<PropsT>);

export default TextAttribute;
