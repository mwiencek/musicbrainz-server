/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {type OptionItem}
  from '../../common/components/Autocomplete2/types';
import {
  PART_OF_SERIES_LINK_TYPES,
  PART_OF_SERIES_LINK_TYPE_GIDS,
} from '../../common/constants';
import linkedEntities from '../../common/linkedEntities';
import {compare} from '../../common/i18n';

import getSeriesTypeId from './getSeriesTypeId';

function cmpLinkTypeOptions(a, b) {
  return (
    (a.entity.child_order - b.entity.child_order) ||
    compare(a.name, b.name)
  );
}

function buildOption(linkType, level) {
  return {
    disabled: !linkType.description,
    entity: linkType,
    id: linkType.id,
    level,
    name: linkType.name,
    type: 'option',
  };
}

const optionsCache =
  new Map<string, $ReadOnlyArray<OptionItem<LinkTypeT>>>();

const getDialogLinkTypeOptions = (
  source: CoreEntityT,
  targetType: NonUrlCoreEntityTypeT,
): $ReadOnlyArray<OptionItem<LinkTypeT>> => {
  const entityTypes = [source.entityType, targetType].sort().join('-');
  const cachedOptions = optionsCache.get(entityTypes);
  if (cachedOptions) {
    return cachedOptions;
  }

  const options: Array<OptionItem<LinkTypeT>> = [];
  const seriesTypeId = getSeriesTypeId(source);
  const seriesItemType = seriesTypeId
    ? (linkedEntities.series_type[String(seriesTypeId)]?.item_entity_type)
    : null;

  function buildOptions(parent, level) {
    const children = parent.children;

    if (!children) {
      return;
    }

    const childOptions = [];
    let linkType;
    let i = 0;

    while ((linkType = children[i++])) {
      if (
        seriesItemType &&
        PART_OF_SERIES_LINK_TYPE_GIDS.includes(linkType.gid) &&
        linkType.gid !== PART_OF_SERIES_LINK_TYPES[seriesItemType]
      ) {
        continue;
      }
      childOptions.push(buildOption(linkType, level));
    }

    childOptions.sort(cmpLinkTypeOptions);

    for (let i = 0; i < childOptions.length; i++) {
      const option = childOptions[i];
      const linkType = option.entity;
      options.push(option);
      buildOptions(linkType, level + 1);
    }
  }

  buildOptions({
    children: linkedEntities.link_type_tree[entityTypes],
  }, 0);

  optionsCache.set(entityTypes, options);
  return options;
};

export default getDialogLinkTypeOptions;
