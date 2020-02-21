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
  RelationshipPhraseGroupT,
  RootDispatchT,
} from '../types';

import RelationshipPhraseGroup from './RelationshipPhraseGroup';

type Props = {
  +dispatch: RootDispatchT,
  +source: CoreEntityT,
  +targetType: NonUrlCoreEntityTypeT,
  +targetTypeGroup: $ReadOnlyArray<RelationshipPhraseGroupT>,
};

const RelationshipTargetTypeGroup = (React.memo<Props>(({
  dispatch,
  source,
  targetType,
  targetTypeGroup,
}: Props) => (
  targetTypeGroup.map(phraseGroup => (
    <RelationshipPhraseGroup
      dispatch={dispatch}
      group={phraseGroup}
      key={phraseGroup.key}
      source={source}
      targetType={targetType}
    />
  ))
)): React.AbstractComponent<Props>);

export default RelationshipTargetTypeGroup;
