/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

export default function getTargetCredit(
  relationship: {
    +backward: boolean,
    +entity0_credit: string,
    +entity1_credit: string,
    ...
  },
): string {
  return relationship.backward
    ? relationship.entity0_credit
    : relationship.entity1_credit;
}
