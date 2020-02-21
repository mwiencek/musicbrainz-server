/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import RelationshipDialogContent
  from '../components/RelationshipDialogContent';
import {REL_STATUS_ADD} from '../constants';
import type {
  IncompleteRelationshipStateT,
  RootDispatchT,
} from '../types';
import getRelationshipStateKey from '../utility/getRelationshipStateKey';
import getTargetTypeOptions from '../utility/getTargetTypeOptions';

import useCatalystUser from './useCatalystUser';

const RELATIONSHIP_DEFAULTS = {
  _original: null,
  _status: REL_STATUS_ADD,
  attributes: [],
  backward: false,
  begin_date: null,
  editsPending: false,
  end_date: null,
  ended: false,
  entity0_credit: '',
  entity0_id: null,
  entity1_credit: '',
  entity1_id: null,
  id: null,
  linkOrder: 0,
  linkTypeID: null,
  target: null,
  target_type: null,
};

type CommonOptionsT = {
  +closeDialog: () => void,
  +dispatch: RootDispatchT,
  +source: CoreEntityT,
  +targetTypeRef?: {-current: NonUrlCoreEntityTypeT},
  +targetTypeSelectRef: {current: HTMLSelectElement | null},
  +title: string,
};

export default function useRelationshipDialogContent(
  options: $ReadOnly<{
    ...CommonOptionsT,
    relationship: IncompleteRelationshipStateT,
  }>,
): () => React.Element<typeof RelationshipDialogContent> {
  const {
    dispatch,
    relationship,
    source,
    closeDialog,
    targetTypeSelectRef,
    targetTypeRef,
    title,
  } = options;

  const user = useCatalystUser();

  const targetTypeOptions = React.useMemo(() => {
    return getTargetTypeOptions(user, source);
  }, [user, source]);

  return React.useCallback(() => (
    <RelationshipDialogContent
      closeDialog={closeDialog}
      relationship={relationship}
      rootDispatch={dispatch}
      source={source}
      targetTypeOptions={targetTypeOptions}
      targetTypeRef={targetTypeRef}
      targetTypeSelectRef={targetTypeSelectRef}
      title={title}
      user={user}
    />
  ), [
    closeDialog,
    dispatch,
    relationship,
    source,
    targetTypeOptions,
    targetTypeRef,
    targetTypeSelectRef,
    title,
    user,
  ]);
}

export function useNewRelationshipDialogContent(
  options: $ReadOnly<{
    ...CommonOptionsT,
    newRelationshipData?:
      $Shape<{...IncompleteRelationshipStateT}> | null,
  }>,
): () => React.Element<typeof RelationshipDialogContent> {
  const {newRelationshipData, ...otherOptions} = options;

  const newRelationshipState = {
    ...RELATIONSHIP_DEFAULTS,
    _key: getRelationshipStateKey(null),
    source_type: options.source.entityType,
    ...newRelationshipData,
  };

  return useRelationshipDialogContent({
    ...otherOptions,
    relationship: newRelationshipState,
  });
}
