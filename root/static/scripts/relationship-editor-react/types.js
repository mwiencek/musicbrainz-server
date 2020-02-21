/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import type {RelationshipEditStatusT} from './constants';
import type {RelationshipStateKeyT} from './utility/getRelationshipStateKey';
import type {StateT as DialogStateT}
  from './components/RelationshipDialogContent';

export type LinkAttributeTypeOption = $ReadOnly<{
  ...LinkAttrTypeT,
  +level: number,
}>;

export type GroupedLinkAttributes = {
  __proto__: null,
  [attributeRootId: StrOrNum]: ?Array<LinkAttrT>,
  ...
};

export type LinkTypeTreeT = {
  [entityTypes: string]: $ReadOnlyArray<LinkTypeT>,
};

export type CreditChangeOptionT =
  | ''
  | 'all'
  | 'same-entity-types'
  | 'same-relationship-type';

export type RelationshipTargetTypeGroupsT = {
  __proto__: null,
  +[targetType: NonUrlCoreEntityTypeT]:
    $ReadOnlyArray<RelationshipPhraseGroupT>,
};

export type RelationshipPhraseGroupT = {
  +backward: boolean,
  +isOrderableByUser: boolean,
  +key: string,
  +relationships: $ReadOnlyArray<IncompleteRelationshipStateT>,
  +textPhrase: string,
  +typeId: number | null,
};

export type WritableRelationshipPhraseGroupT = {
  ...RelationshipPhraseGroupT,
  relationships: Array<IncompleteRelationshipStateT>,
};

/*
 * This only precludes the target entity from being a URL,
 * not the source entity. The relationship editor *is* accesible
 * for source URLs, but these should otherwise be edited via the
 * external links editor.
 */
export type NonUrlRelationshipT = $ReadOnly<{
  ...RelationshipT,
  +target: NonUrlCoreEntityT,
  +target_type: NonUrlCoreEntityTypeT,
}>;

export type SeededRelationshipT = $ReadOnly<{
  ...NonUrlRelationshipT,
  +entity0_id: number | null,
  +entity1_id: number | null,
  +id: null,
  +linkTypeID: number | null,
}>;

export type CompleteRelationshipStateT = $ReadOnly<{
  ...NonUrlRelationshipT,
  +_key: RelationshipStateKeyT,
  +_original: NonUrlRelationshipT | null,
  +_status: RelationshipEditStatusT,
  +id: number | null,
}>;

export type IncompleteRelationshipStateT = $ReadOnly<{
  ...CompleteRelationshipStateT,
  +entity0_id: number | null,
  +entity1_id: number | null,
  +linkTypeID: number | null,
  +target: NonUrlCoreEntityT | null,
  +target_type: NonUrlCoreEntityTypeT | null,
}>;

export type AttributeStateT = {
  +creditedAs?: string,
  +error: string,
  +key: number,
  +max: number | null,
  +min: number | null,
  +textValue?: string,
  +type: LinkAttrTypeT,
};

export type FetchedTypeNameT =
  | 'link_attribute_type'
  | 'link_type'
  | 'series_type';

/* eslint-disable flowtype/sort-keys */
/*
 * Defines the kind of actions handled by ./reducer.js.
 * All actions that modify state are listed here.
 */
export type RootActionT =
  | {
      +type: 'accept-relationship-dialog',
      +relationship: IncompleteRelationshipStateT,
      +newRelationshipState: CompleteRelationshipStateT,
    }
  | {
      +type: 'remove-relationship',
      +relationship: IncompleteRelationshipStateT,
    }
  | {
      +type: 'move-relationship-down',
      +relationship: IncompleteRelationshipStateT,
    }
  | {
      +type: 'move-relationship-up',
      +relationship: IncompleteRelationshipStateT,
    }
  | {
      +type: 'toggle-ordering',
      +hasOrdering: boolean,
      +phraseGroup: RelationshipPhraseGroupT,
      +targetType: NonUrlCoreEntityTypeT,
    }
  | {
      +type: 'set-type-info',
      +typeName: 'link_attribute_type',
      +typeInfo: $ReadOnlyArray<LinkAttrTypeT>,
    }
  | {
      +type: 'set-type-info',
      +typeName: 'link_type',
      +typeInfo: $ReadOnlyArray<LinkTypeT>,
    }
  | {
      +type: 'set-type-info',
      +typeName: 'series_type',
      +typeInfo: $ReadOnlyArray<SeriesTypeT>,
    }
  | {
      +type: 'set-type-info-error',
      +typeName: FetchedTypeNameT,
      +error: Error,
    };

export type RootDispatchT = (RootActionT) => void;

export type LinkAttributeShapeT = {
  +credited_as?: string,
  +text_value?: string,
  +type: LinkAttrTypeT | null,
  ...
};

export type LinkAttributesByRootIdT = {
  __proto__: null,
  [rootId: number]: Array<LinkAttributeShapeT>,
};
