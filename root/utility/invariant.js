/*
 * @flow strict
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

export default function invariant(
  cond: mixed,
  msg?: string = 'Invariant Violation',
): void {
  // flowlint sketchy-null-mixed:off
  if (!cond) {
    throw new Error(msg);
  }
}
