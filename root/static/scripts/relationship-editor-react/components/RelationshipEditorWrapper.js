/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import hydrate from '../../../../utility/hydrate';
import useRelationshipEditorState, {
  type InitialStateArgsT,
} from '../hooks/useRelationshipEditorState';

import RelationshipEditor, {
  reducer,
} from './RelationshipEditor';

/*
 * Wraps the relationship editor component to provide it with state
 * and hydration.
 *
 * TODO: Pass state/dispatch in from the edit form once that's written,
 * and perform hydration there. This component can then be removed.
 *
 * N.B. For series, use ./SeriesRelationshipEditor.js instead.
 */

type PropsT = InitialStateArgsT;

const RelationshipEditorWrapper =
  (hydrate<PropsT>('div.relationship-editor', (
    props: PropsT,
  ): React.Element<typeof RelationshipEditor> => {
    const [state, dispatch] = useRelationshipEditorState(
      props,
      reducer,
    );

    return (
      <RelationshipEditor
        dispatch={dispatch}
        formName={props.formName}
        injectHiddenInputs
        state={state}
      />
    );
  }): React.AbstractComponent<PropsT, void>);

export default RelationshipEditorWrapper;
