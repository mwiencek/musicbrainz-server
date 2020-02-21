/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {
  REL_STATUS_EDIT,
  REL_STATUS_NOOP,
  type RelationshipEditStatusT,
} from '../constants';
import type {
  IncompleteRelationshipStateT,
} from '../types';

import compareRelationships, {
  COMPARE_ENTITY_CREDITS,
} from './compareRelationships';

export default function getRelationshipEditStatus(
  source: CoreEntityT,
  relationship: IncompleteRelationshipStateT,
): RelationshipEditStatusT {
  /*
   * New relationships are always REL_STATUS_ADD; this should only
   * be called on existing relationships.
   */
  invariant(relationship._original);

  return compareRelationships(
    source,
    relationship._original,
    relationship,
    COMPARE_ENTITY_CREDITS,
  ) ? REL_STATUS_EDIT : REL_STATUS_NOOP;
}
