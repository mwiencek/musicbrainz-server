/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {uniqueId} from '../../common/utility/strings';
import {type SeededRelationshipT} from '../types';

export opaque type RelationshipStateKeyT: string = string;

export default function getRelationshipStateKey(
  relationship: RelationshipT | SeededRelationshipT | null,
): RelationshipStateKeyT {
  return String(relationship?.id ?? uniqueId('new-'));
}
