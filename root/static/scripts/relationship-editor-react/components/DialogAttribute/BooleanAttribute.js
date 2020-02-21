/*
 * @flow strict-local
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
  | {+type: 'toggle', +enabled: boolean};
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +dispatch: (rootKey: number, action: ActionT) => void,
  +state: StateT,
};

export type StateT = $ReadOnly<{
  ...AttributeStateT,
  +control: 'checkbox',
  +enabled: boolean,
}>;

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  const newState: {...StateT} = {...state};

  switch (action.type) {
    case 'toggle': {
      newState.enabled = action.enabled;
      break;
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  return newState;
}

const BooleanAttribute = (React.memo(({
  state,
  dispatch,
}: PropsT) => (
  <label>
    <input
      checked={state.enabled}
      onChange={(event) => {
        dispatch(state.key, {
          enabled: event.target.checked,
          type: 'toggle',
        });
      }}
      type="checkbox"
    />
    {' '}
    {state.type.l_name}
  </label>
)): React.AbstractComponent<PropsT>);

export default BooleanAttribute;
