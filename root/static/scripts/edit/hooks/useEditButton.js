/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

export default function useEditButton(
  firstInputRef: {+current: HTMLInputElement | null},
  isInitiallyExpanded?: boolean = false,
): [
  boolean,
  (event: SyntheticInputEvent<HTMLInputElement>) => void,
] {
  const [isExpanded, setExpanded] = React.useState(isInitiallyExpanded);
  const shouldFocusInputRef = React.useRef(false);

  function handleExpand(event: SyntheticInputEvent<HTMLInputElement>) {
    event.preventDefault();
    setExpanded(true);
    shouldFocusInputRef.current = true;
  }

  React.useLayoutEffect(() => {
    if (shouldFocusInputRef.current) {
      shouldFocusInputRef.current = false;
      firstInputRef.current?.focus();
    }
  });

  return [isExpanded, handleExpand];
}
