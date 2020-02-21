/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import type {
  CompleteRelationshipStateT,
  IncompleteRelationshipStateT,
} from '../types';

export default function getCompleteRelationshipState(
  relationship: IncompleteRelationshipStateT,
): CompleteRelationshipStateT | null {
  if (
    relationship.entity0_id != null &&
    relationship.entity1_id != null &&
    relationship.linkTypeID != null &&
    relationship.target != null &&
    relationship.target_type != null
  ) {
    /*
     * XXX: We should be able to just return `relationship` back
     * here, since it's read-only. Flow doesn't like that despite the
     * refinements above, hence the `$FlowIgnore` below. Unfortunately,
     * that has the potential to silence real errors in the future, so
     * we have the added `flow-include` to remain type-safe.
     */

    /* eslint-disable multiline-comment-style */
    /* flow-include
    ({
      ...relationship,
      entity0_id: relationship.entity0_id,
      entity1_id: relationship.entity1_id,
      linkTypeID: relationship.linkTypeID,
      target: relationship.target,
      target_type: relationship.target_type,
    }: CompleteRelationshipStateT);
    */
    /* eslint-enable multiline-comment-style */

    // $FlowIgnore[incompatible-return]
    return relationship;
  }
  return null;
}
