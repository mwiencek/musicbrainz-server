/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import EntityLink from '../../common/components/EntityLink';
import {
  ENTITY_NAMES,
  ENTITIES_WITH_RELATIONSHIP_CREDITS,
} from '../../common/constants';
import type {
  IncompleteRelationshipStateT,
} from '../types';

import DialogEntityCredit, {
  type ActionT as DialogEntityCreditActionT,
  type StateT as DialogEntityCreditStateT,
  createInitialState as createDialogEntityCreditState,
  reducer as dialogEntityCreditReducer,
} from './DialogEntityCredit';

export type ActionT = DialogEntityCreditActionT;

type PropsT = {
  +backward: boolean,
  +dispatch: (ActionT) => void,
  +linkType: LinkTypeT | null,
  +source: CoreEntityT,
  +state: StateT,
  +targetType: CoreEntityTypeT,
};

export type StateT = DialogEntityCreditStateT;

export function createInitialState(
  relationship: IncompleteRelationshipStateT,
): StateT {
  return createDialogEntityCreditState(
    relationship.backward
      ? relationship.entity1_credit
      : relationship.entity0_credit,
  );
}

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  return dialogEntityCreditReducer(state, action);
}

const DialogSourceEntity = (React.memo<PropsT>(({
  backward,
  dispatch,
  linkType,
  source,
  state,
  targetType,
}: PropsT): React.Element<'tr'> => {
  return (
    <tr>
      <td className="section">
        {addColonText(ENTITY_NAMES[source.entityType]())}
      </td>
      <td>
        <EntityLink
          allowNew
          entity={source}
          target="_blank"
        />
        {ENTITIES_WITH_RELATIONSHIP_CREDITS[source.entityType] ? (
          <DialogEntityCredit
            backward={backward}
            dispatch={dispatch}
            entity={source}
            linkType={linkType}
            state={state}
            targetType={targetType}
          />
        ) : null}
      </td>
    </tr>
  );
}): React.AbstractComponent<PropsT>);

export default DialogSourceEntity;
