/*
 * @flow
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {
  SERIES_ORDERING_TYPE_AUTOMATIC,
  SERIES_ORDERING_ATTRIBUTE,
} from '../../common/constants';
import {compare} from '../../common/i18n';
import linkedEntities from '../../common/linkedEntities';
import {compareStrings} from '../../common/utility/compare';
import compareDates, {
  compareDatePeriods,
} from '../../common/utility/compareDates';
import {fixedWidthInteger} from '../../common/utility/strings';
import type {
  IncompleteRelationshipStateT,
} from '../../relationship-editor-react/types';

function compareAttributes(a, b) {
  return (
    (a.typeID - b.typeID) ||
    compareStrings(a.text_value ?? '', b.text_value ?? '') ||
    compareStrings(a.credited_as ?? '', b.credited_as ?? '')
  );
}

function compareAttributeLists(a, b) {
  const aLength = a.length;
  let result = aLength - b.length;
  if (!result) {
    for (let i = 0; i < aLength; i++) {
      result = compareAttributes(a[i], b[i]);
      if (result) {
        break;
      }
    }
  }
  return result;
}

function _memoize<-T: {...}, +U>(
  func: (T) => U,
  defaultValue: U,
): (?T) => U {
  const cache = new WeakMap();
  return function (obj: ?T): U {
    if (obj == null) {
      return defaultValue;
    }
    let result = cache.get(obj);
    if (result != null) {
      return result;
    }
    result = func(obj);
    cache.set(obj, result);
    return result;
  };
}

function getReleaseEventDate(
  event: ReleaseEventT,
  // eslint-disable-next-line no-unused-vars -- map index
  index: number,
): PartialDateT | null {
  return event.date;
}

function getReleaseLabelCatalogNumber(
  label: ReleaseLabelT,
  // eslint-disable-next-line no-unused-vars -- map index
  index: number,
): string {
  return label.catalogNumber ?? '';
}

const getReleaseFirstDate = _memoize<ReleaseT, PartialDateT | null>(
  (release: ReleaseT) => {
    const sortedDates =
      release.events?.map(getReleaseEventDate).sort(compareDates);
    if (sortedDates?.length) {
      return sortedDates[0];
    }
    return null;
  },
  null,
);

const getReleaseFirstCatalogNumber = _memoize<ReleaseT, string>(
  (release: ReleaseT): string => {
    const sortedCatalogNumbers =
      release.labels?.map(getReleaseLabelCatalogNumber).sort(compareStrings);
    if (sortedCatalogNumbers?.length) {
      return sortedCatalogNumbers[0];
    }
    return '';
  },
  '',
);

const intRegExp = /^\d+$/;
const intPartRegExp = /(\d+)/;

const getPaddedSeriesNumber = _memoize<
  RelationshipT | IncompleteRelationshipStateT,
  string,
>((relationship: RelationshipT | IncompleteRelationshipStateT) => {
  const attributes = relationship.attributes;
  const attributeCount = attributes.length;

  for (let i = 0; i < attributeCount; i++) {
    const attribute = attributes[i];

    if (attribute.type.gid === SERIES_ORDERING_ATTRIBUTE) {
      const parts = (attribute.text_value ?? '').split(intPartRegExp);

      for (let p = 0; p < parts.length; p++) {
        const part = parts[p];
        if (intRegExp.test(part)) {
          parts[p] = fixedWidthInteger(part, 10);
        }
      }
      return parts.join('');
    }
  }

  return '';
}, '');

/*
 * Compares two relationships `a` and `b`, returning 0 if they are
 * duplicates of each other (not necessarily identical, unless the
 * `compareEntityCredits` option is specified); or a negative or
 * positive number indicating the relative sort order.
 *
 * So, this function serves three purposes:
 *
 *   1.  Providing a sort order for display.
 *   2.  Determining if two relationships are duplicates.
 *   3.  Determining if two relationships are identical.
 *
 * "Duplicate" in this this case means "not unique at the database
 * level." An example of something that does not impact uniqueness is
 * a relationship's entity credits. These do determine whether the
 * relationships are identical, though -- and that's also useful when
 * we want to know if a relationship was modified. The
 * `compareEntityCredits` option exists for that purpose.
 */
export default function compareRelationships(
  source: CoreEntityT,
  a: RelationshipT | IncompleteRelationshipStateT,
  b: RelationshipT | IncompleteRelationshipStateT,
  options?: {
    compareEntityCredits?: boolean,
  },
): number {
  if (a === b) {
    return 0;
  }

  const linkTypeCmp =
    (a.linkTypeID ?? 0) - (b.linkTypeID ?? 0);
  if (linkTypeCmp) {
    return linkTypeCmp;
  }

  const directionCmp =
    (a.backward ? 1 : 0) - (b.backward ? 1 : 0);
  if (directionCmp) {
    return directionCmp;
  }

  const targetA = a.target;
  const targetB = b.target;

  const targetIdCmp =
    ((targetA?.id) ?? 0) - ((targetB?.id) ?? 0);

  /*
   * If we're editing an automatically-ordered series, ignore the
   * link orders: those will be set by the server.
   *
   * Note that such series' relationships are ordered by number
   * attribute, then relationship date, then any entity-specific
   * ordering. Normally we'd compare the link orders *before* the
   * relationship dates, but that's not applicable here because,
   * again, the link orders are determined automatically.
   *
   * Please keep all sorting logic consistent with
   * `Data::Series::automatically_reorder` on the server.
   */
  if (
    source.entityType === 'series' &&
    source.orderingTypeID === SERIES_ORDERING_TYPE_AUTOMATIC
  ) {
    const seriesNumberCmp = compareStrings(
      getPaddedSeriesNumber(a),
      getPaddedSeriesNumber(b),
    );
    if (seriesNumberCmp) {
      /*
       * Observation: If the number attributes are different, the
       * relationships would reference different rows in the link
       * table, which is enough to establish uniqueness.
       */
      return seriesNumberCmp;
    }

    const datePeriodCmp = compareDatePeriods(a, b);
    if (datePeriodCmp) {
      return datePeriodCmp;
    }

    if (targetIdCmp) {
      /*
       * Observation: The link types are equal here due to the
       * `linkTypeCmp` bail-out above.
       */
      const linkTypeGid = a.linkTypeID
        ? linkedEntities.link_type[a.linkTypeID]
        : null;

      switch (linkTypeGid) {
        case '707d947d-9563-328a-9a7d-0c5b9c3a9791': { // event
          /*:: invariant(!targetA || targetA.entityType === 'event'); */
          /*:: invariant(!targetB || targetB.entityType === 'event'); */

          const eventDateCmp = compareDatePeriods(
            targetA,
            targetB,
          );
          if (eventDateCmp) {
            return eventDateCmp;
          }

          const timeCmp = compareStrings(
            targetA ? targetA.time : '',
            targetB ? targetB.time : '',
          );
          if (timeCmp) {
            return timeCmp;
          }
          break;
        }

        case '3fa29f01-8e13-3e49-9b0a-ad212aa2f81d': { // release
          /*:: invariant(!targetA || targetA.entityType === 'release'); */
          /*:: invariant(!targetB || targetB.entityType === 'release'); */

          const firstDateCmp = compareDates(
            getReleaseFirstDate(targetA),
            getReleaseFirstDate(targetB),
          );
          if (firstDateCmp) {
            return firstDateCmp;
          }

          const firstCatalogNumberCmp = compareStrings(
            getReleaseFirstCatalogNumber(targetA),
            getReleaseFirstCatalogNumber(targetB),
          );
          if (firstCatalogNumberCmp) {
            return firstCatalogNumberCmp;
          }
          break;
        }

        case '01018437-91d8-36b9-bf89-3f885d53b5bd': { // release group
          /* eslint-disable multiline-comment-style */
          /* flow-include
          invariant(!targetA || targetA.entityType === 'release_group');
          invariant(!targetB || targetB.entityType === 'release_group');
          */
          /* eslint-enable multiline-comment-style */

          const firstReleaseDateCmp = compareStrings(
            targetA?.firstReleaseDate ?? '',
            targetB?.firstReleaseDate ?? '',
          );
          if (firstReleaseDateCmp) {
            return firstReleaseDateCmp;
          }
          break;
        }
      }
    }
  } else {
    const linkOrderCmp = a.linkOrder - b.linkOrder;
    if (linkOrderCmp) {
      return linkOrderCmp;
    }
  }

  const datePeriodCmp = compareDatePeriods(a, b);
  if (datePeriodCmp) {
    return datePeriodCmp;
  }

  let sourceCreditA = '';
  let targetCreditA = '';
  let sourceCreditB = '';
  let targetCreditB = '';

  if (options?.compareEntityCredits) {
    if (a.backward) {
      sourceCreditA = a.entity1_credit;
      targetCreditA = a.entity0_credit;
    } else {
      sourceCreditA = a.entity0_credit;
      targetCreditA = a.entity1_credit;
    }

    if (b.backward) {
      sourceCreditB = b.entity1_credit;
      targetCreditB = b.entity0_credit;
    } else {
      sourceCreditB = b.entity0_credit;
      targetCreditB = b.entity1_credit;
    }
  }

  if (targetIdCmp) {
    /*
     * The target name comparison is performed to make the sorting
     * nicer for display, but should only be performed if the targets
     * are actually different. If we were to receive different versions
     * of the same entity via Autocomplete lookups, for example, it
     * would be an error for this function to return a non-zero value
     * if the relationships were otherwise identical.
     */
    return compare(
      targetA ? (targetA.sort_name || targetCreditA || targetA.name) : '',
      targetB ? (targetB.sort_name || targetCreditB || targetB.name) : '',
    ) || targetIdCmp;
  }

  const attributesCmp = compareAttributeLists(a.attributes, b.attributes);
  if (attributesCmp) {
    return attributesCmp;
  }

  if (options?.compareEntityCredits) {
    return (
      compare(targetCreditA, targetCreditB) ||
      compare(sourceCreditA, sourceCreditB)
    );
  }

  return 0;
}

export const COMPARE_ENTITY_CREDITS =
  Object.freeze({compareEntityCredits: true});
