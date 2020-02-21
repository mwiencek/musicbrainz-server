/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';
import {captureException} from '@sentry/browser';

import {hasSessionStorage} from '../../common/utility/storage';
import type {
  StateT,
} from '../components/RelationshipEditor';
import type {
  RootActionT,
  RootDispatchT,
  SeededRelationshipT,
} from '../types';

export type InitialStateArgsT = {
  +$c: CatalystContextT,
  +formName: string,
  +seededRelationships: ?$ReadOnlyArray<SeededRelationshipT>,
  +source: CoreEntityT,
};

function getInitialState(args: InitialStateArgsT): StateT {
  const {
    $c,
    source,
    seededRelationships,
  } = args;

  let submittedRelationships = null;
  if (hasSessionStorage && $c.req.method === 'POST') {
    const submission = sessionStorage.getItem('submittedRelationships');
    if (nonEmpty(submission)) {
      try {
        submittedRelationships = JSON.parse(submission);
      } catch (e) {
        captureException(e);
      } finally {
        sessionStorage.removeItem('submittedRelationships');
      }
    }
  }

  return {
    allLinkAttributeTypes: null,
    allLinkTypes: null,
    reducerError: null,
    seededRelationships,
    source,
    submittedRelationships,
    targetTypeGroups: Object.create(null),
    typeInfoLoadErrors: [],
    typeInfoToLoad:
      new Set(['link_attribute_type', 'link_type', 'series_type']),
  };
}

function loadTypeInfoIfNeeded(
  loadingTypeInfo,
  typeName,
  dispatch,
) {
  if (loadingTypeInfo.has(typeName)) {
    return;
  }

  loadingTypeInfo.add(typeName);

  const url = '/ws/js/type-info/' + typeName;
  fetch('/ws/js/type-info/' + typeName)
    .then((resp) => {
      if (!resp.ok) {
        throw new Error(
          'Got a ' + String(resp.status) + ' fetching ' +
          url,
        );
      }
      return resp.json();
    })
    .then((typeInfo: {+[listName: string]: mixed}) => {
      // $FlowIgnore[speculation-ambiguous]
      dispatch({
        type: 'set-type-info',
        typeInfo: typeInfo[typeName + '_list'],
        typeName,
      });
      loadingTypeInfo.delete(typeName);
    })
    .catch((error) => {
      dispatch({
        error,
        type: 'set-type-info-error',
        typeName,
      });
    });
}

export default function useRelationshipEditorState(
  args: InitialStateArgsT,
  reducer: (StateT, RootActionT) => StateT,
): [StateT, RootDispatchT] {
  const stateAndDispatch = React.useReducer(
    reducer,
    args,
    getInitialState,
  );
  const [state, dispatch] = stateAndDispatch;

  const loadingTypeInfoRef = React.useRef(null);

  React.useEffect(() => {
    const loadingTypeInfo =
      loadingTypeInfoRef.current ??
      (loadingTypeInfoRef.current = new Set<string>());

    for (const typeName of state.typeInfoToLoad) {
      loadTypeInfoIfNeeded(loadingTypeInfo, typeName, dispatch);
    }
  }, [
    state.typeInfoToLoad,
    dispatch,
  ]);

  return stateAndDispatch;
}
