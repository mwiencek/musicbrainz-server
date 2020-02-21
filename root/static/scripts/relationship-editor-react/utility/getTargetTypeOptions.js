/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {ENTITY_NAMES} from '../../common/constants';
import {compare} from '../../common/i18n';
import linkedEntities from '../../common/linkedEntities';
import {
  isLocationEditor,
  isRelationshipEditor,
} from '../../common/utility/privileges';
import getDialogLinkTypeOptions from '../utility/getDialogLinkTypeOptions';

function editorMayEditTypes(user, typeString) {
  switch (typeString) {
    case 'area-area':
    case 'area-url':
      return isLocationEditor(user);
    case 'area-instrument':
    case 'instrument-instrument':
    case 'instrument-url':
      return isRelationshipEditor(user);
    default:
      return true;
  }
}

const allowedRelations =
  new Map<CoreEntityTypeT, Array<NonUrlCoreEntityTypeT>>();

function calculateAllowedRelations(user) {
  const entityTypePairs = Object.keys(linkedEntities.link_type_tree);

  for (let i = 0; i < entityTypePairs.length; i++) {
    const typeString = entityTypePairs[i];
    const [type0, type1] =
      // $FlowIgnore[incompatible-cast]
      (typeString.split('-'): $ReadOnlyArray<NonUrlCoreEntityTypeT>);

    if (
      type0 !== 'url' &&
      type1 !== 'url' &&
      editorMayEditTypes(user, typeString)
    ) {
      const typeList = allowedRelations.get(type0);
      if (typeList) {
        typeList.push(type1);
      } else {
        allowedRelations.set(type0, [type1]);
      }
      if (type0 !== type1) {
        const typeList = allowedRelations.get(type1);
        if (typeList) {
          typeList.push(type0);
        } else {
          allowedRelations.set(type1, [type0]);
        }
      }
    }
  }

  for (const typeList of allowedRelations.values()) {
    typeList.sort();
  }
}

export type TargetTypeOptionsT =
  $ReadOnlyArray<{+text: string, +value: NonUrlCoreEntityTypeT}>;

export default function getTargetTypeOptions(
  user: ActiveEditorT,
  source: CoreEntityT,
): TargetTypeOptionsT {
  if (!allowedRelations.size) {
    calculateAllowedRelations(user);
  }

  const typeList: $ReadOnlyArray<NonUrlCoreEntityTypeT> =
    allowedRelations.get(source.entityType) ?? [];

  return typeList
    .filter((targetType) => (
      getDialogLinkTypeOptions(source, targetType).length > 0
    ))
    .map((type) => ({
      text: ENTITY_NAMES[type](),
      value: type,
    }))
    .sort((a, b) => compare(a.text, b.text));
}
