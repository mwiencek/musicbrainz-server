/*
 * @flow strict-local
 * Copyright (C) 2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

// $FlowIgnore[untyped-import]
import $ from 'jquery';
import * as React from 'react';

import hydrate from '../../../../utility/hydrate';
import {PART_OF_SERIES_LINK_TYPES} from '../../common/constants';
import linkedEntities from '../../common/linkedEntities';
import useRelationshipEditorState, {
  type InitialStateArgsT,
} from '../hooks/useRelationshipEditorState';

import RelationshipEditor, {
  reducer,
} from './RelationshipEditor';

export type PropsT = $ReadOnly<{
  ...InitialStateArgsT,
  +source: SeriesT,
}>;

const SeriesRelationshipEditor = (hydrate<PropsT>('div.relationship-editor', (
  props: PropsT,
): React.Element<typeof RelationshipEditor> => {
  const series = props.source;

  const [state, dispatch] = useRelationshipEditorState(
    props,
    reducer,
  );

  const [seriesTypeId, setSeriesTypeId] = React.useState<string | null>(
    // $FlowIgnore[sketchy-null-number]
    series.typeID ? String(series.typeID) : null,
  );

  // $FlowIgnore[sketchy-null-string]
  const seriesType = seriesTypeId
    ? linkedEntities.series_type[seriesTypeId]
    : null;

  const seriesHasItems = React.useMemo(function () {
    if (state.typeInfoToLoad.size) {
      /*
       * Without type info loaded, assume there to be items for now
       * (i.e. disable the type field) until we have the necessary
       * info.
       */
      return true;
    }

    if (!seriesType) {
      return false;
    }

    const partOfSeriesLinkTypeGid =
      PART_OF_SERIES_LINK_TYPES[seriesType.item_entity_type];
    // $FlowIgnore[sketchy-null-string]
    const partOfSeriesLinkTypeId = partOfSeriesLinkTypeGid
      ? linkedEntities.link_type[partOfSeriesLinkTypeGid]?.id
      : null;

    // $FlowIgnore[sketchy-null-number]
    invariant(partOfSeriesLinkTypeId);

    const targetTypeGroups = state.targetTypeGroups;
    for (const targetType in targetTypeGroups) {
      // $FlowIssue[incompatible-type]
      const phraseGroups = targetTypeGroups[targetType];
      for (const phraseGroup of phraseGroups) {
        if (
          phraseGroup.typeId != null &&
          phraseGroup.typeId === partOfSeriesLinkTypeId
        ) {
          return phraseGroup.relationships.length > 0;
        }
      }
    }

    return false;
  }, [
    seriesType,
    state.targetTypeGroups,
    state.typeInfoToLoad,
  ]);

  function handleSeriesTypeChange(event) {
    setSeriesTypeId(event.target.value);
  }

  function updateAllowedTypes() {
    if (seriesType && seriesHasItems) {
      $('#id-edit-series\\.type_id > option').each(function () {
        const thisType = linkedEntities.series_type[this.value];
        if (
          thisType.item_entity_type === seriesType.item_entity_type
        ) {
          this.removeAttribute('disabled');
        } else {
          this.setAttribute('disabled', 'disabled');
        }
      });
    }
  }

  React.useEffect(() => {
    $('#id-edit-series\\.type_id').on('change', handleSeriesTypeChange);

    updateAllowedTypes();

    return () => {
      $('#id-edit-series\\.type_id').off('change', handleSeriesTypeChange);
    };
  });

  return (
    <RelationshipEditor
      dispatch={dispatch}
      formName={props.formName}
      injectHiddenInputs
      state={state}
    />
  );
}): React.AbstractComponent<PropsT, void>);

export default SeriesRelationshipEditor;
