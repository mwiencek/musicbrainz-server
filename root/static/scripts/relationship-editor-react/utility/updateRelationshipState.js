/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import isLinkTypeDirectionOrderable
  from '../../../../utility/isLinkTypeDirectionOrderable';
import {
  cmpPhraseGroupLinkTypeInfo,
} from '../../../../utility/groupRelationships';
import {SERIES_ORDERING_TYPE_AUTOMATIC} from '../../common/constants';
import {sortedIndexWith} from '../../common/utility/arrays';
import {uniqueId} from '../../common/utility/strings';
import {interpolateText} from '../../edit/utility/linkPhrase';
import type {
  IncompleteRelationshipStateT,
  RelationshipPhraseGroupT,
  RelationshipTargetTypeGroupsT,
  WritableRelationshipPhraseGroupT,
} from '../types';

import compareRelationships from './compareRelationships';
import getRelationshipLinkType from './getRelationshipLinkType';

const linkPhraseCache = new WeakMap();

export function getLinkPhrase(
  relationship: IncompleteRelationshipStateT,
): string {
  let linkPhrase = linkPhraseCache.get(relationship);
  if (linkPhrase) {
    return linkPhrase;
  }
  const linkType = getRelationshipLinkType(relationship);
  if (!linkType) {
    return '';
  }
  linkPhrase = interpolateText(
    linkType,
    relationship.attributes,
    relationship.backward ? 'reverse_link_phrase' : 'link_phrase',
    linkType.orderable_direction > 0,
  );
  linkPhraseCache.set(relationship, linkPhrase);
  return linkPhrase;
}

function _createPhraseGroup(
  linkPhrase,
  relationship,
  source,
) {
  const linkType = getRelationshipLinkType(relationship);
  return {
    backward: relationship.backward,
    isOrderableByUser: linkType ? (
      isLinkTypeDirectionOrderable(linkType, relationship.backward) &&
      !(source.entityType === 'series' &&
        source.orderingTypeID === SERIES_ORDERING_TYPE_AUTOMATIC)
    ) : false,
    key: uniqueId(),
    relationships: [],
    textPhrase: linkPhrase,
    typeId: linkType ? linkType.id : null,
  };
}

export function createWritablePhraseGroup(
  linkPhrase: string,
  relationship: IncompleteRelationshipStateT,
  source: CoreEntityT,
): WritableRelationshipPhraseGroupT {
  return _createPhraseGroup(linkPhrase, relationship, source);
}

export function createPhraseGroup(
  linkPhrase: string,
  relationship: IncompleteRelationshipStateT,
  source: CoreEntityT,
): {...RelationshipPhraseGroupT} {
  return _createPhraseGroup(linkPhrase, relationship, source);
}

export class DuplicateRelationshipError extends Error {
  +relationship: IncompleteRelationshipStateT;

  constructor(relationship: IncompleteRelationshipStateT) {
    super('This relationship already exists.');
    this.name = 'DuplicateRelationshipError';
    this.relationship = relationship;
  }
}

export function getRelationshipPath(
  targetTypeGroups: RelationshipTargetTypeGroupsT,
  relationship: IncompleteRelationshipStateT,
  source: CoreEntityT,
): [boolean, NonUrlCoreEntityTypeT | null, number, number] {
  const targetType = relationship.target_type;
  if (!targetType) {
    return [false, null, -1, -1];
  }

  const phraseGroups = targetTypeGroups[targetType];

  const [phraseGroupIndex, phraseGroupExists] = sortedIndexWith(
    phraseGroups,
    {
      backward: relationship.backward,
      textPhrase: getLinkPhrase(relationship),
      typeId: relationship.linkTypeID,
    },
    cmpPhraseGroupLinkTypeInfo,
  );

  if (!phraseGroupExists) {
    // -1 indicates the phrase group doesn't exist.
    return [false, targetType, phraseGroupIndex, -1];
  }

  const phraseGroup = phraseGroups[phraseGroupIndex];

  const [relationshipIndex, relationshipExists] = sortedIndexWith(
    phraseGroup.relationships,
    relationship,
    // Don't pass COMPARE_ENTITY_CREDITS here.
    (a, b) => compareRelationships(source, a, b),
  );

  if (__DEV__ && relationshipExists) {
    invariant(
      relationship._key ===
      phraseGroup.relationships[relationshipIndex]._key,
      'relationship key does not match',
    );
  }

  return [
    relationshipExists,
    targetType,
    phraseGroupIndex,
    relationshipIndex,
  ];
}

export function getWritableRelationshipsArray(
  newTargetTypeGroups: {...RelationshipTargetTypeGroupsT},
  targetType: NonUrlCoreEntityTypeT,
  phraseGroupIndex: number,
  newPhraseGroup?: {...RelationshipPhraseGroupT},
): Array<IncompleteRelationshipStateT> {
  const newPhraseGroups: Array<RelationshipPhraseGroupT> =
    newTargetTypeGroups[targetType] =
    [...newTargetTypeGroups[targetType]];

  if (newPhraseGroup) {
    newPhraseGroups.splice(phraseGroupIndex, 0, newPhraseGroup);
  } else {
    newPhraseGroup =
      newPhraseGroups[phraseGroupIndex] =
      {...newPhraseGroups[phraseGroupIndex]};
  }

  const newRelationships =
    newPhraseGroup.relationships =
    newPhraseGroup.relationships.slice(0);

  return newRelationships;
}

export default function updateRelationshipState(
  targetTypeGroups: RelationshipTargetTypeGroupsT,
  oldRelationshipState: IncompleteRelationshipStateT | null,
  newRelationshipState: IncompleteRelationshipStateT | null,
  source: CoreEntityT,
): RelationshipTargetTypeGroupsT {
  const newTargetTypeGroups = {...targetTypeGroups};

  if (oldRelationshipState) {
    const [
      exists,
      targetType,
      phraseGroupIndex,
      relationshipIndex,
    ] = getRelationshipPath(
      newTargetTypeGroups,
      oldRelationshipState,
      source,
    );

    /*
     * If the old relationship didn't exist, it's being newly added.
     * This is just whatever initial data was passed to the dialog,
     * and we can ignore it.
     */
    if (exists) {
      invariant(targetType);
      const relationships = getWritableRelationshipsArray(
        newTargetTypeGroups,
        targetType,
        phraseGroupIndex,
      );
      relationships.splice(relationshipIndex, 1);
    }
  }

  if (newRelationshipState) {
    const [
      exists,
      targetType,
      phraseGroupIndex,
      relationshipIndex,
    ] = getRelationshipPath(
      newTargetTypeGroups,
      newRelationshipState,
      source,
    );

    if (exists) {
      throw new DuplicateRelationshipError(newRelationshipState);
    }

    let newPhraseGroup;
    if (relationshipIndex < 0) {
      newPhraseGroup = createPhraseGroup(
        getLinkPhrase(newRelationshipState),
        newRelationshipState,
        source,
      );
    }

    invariant(targetType);
    const relationships = getWritableRelationshipsArray(
      newTargetTypeGroups,
      targetType,
      phraseGroupIndex,
      newPhraseGroup,
    );
    relationships.splice(relationshipIndex, 0, newRelationshipState);
  }

  return newTargetTypeGroups;
}
