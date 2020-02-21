/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import max from 'lodash/max';
import * as React from 'react';

import ButtonPopover from '../../common/components/ButtonPopover';
import {useNewRelationshipDialogContent}
  from '../hooks/useRelationshipDialogContent';
import type {
  RelationshipPhraseGroupT,
  RootDispatchT,
} from '../types';

import RelationshipItem from './RelationshipItem';

const addAnotherEntityLabels = {
  area: N_l('Add another area'),
  artist: N_l('Add another artist'),
  event: N_l('Add another event'),
  genre: N_l('Add another genre'),
  instrument: N_l('Add another instrument'),
  label: N_l('Add another label'),
  place: N_l('Add another place'),
  recording: N_l('Add another recording'),
  release: N_l('Add another release'),
  release_group: N_l('Add another release group'),
  series: N_l('Add another series'),
  url: () => '',
  work: N_l('Add another work'),
};

type PropsT = {
  +dispatch: RootDispatchT,
  +group: RelationshipPhraseGroupT,
  +source: CoreEntityT,
  +targetType: NonUrlCoreEntityTypeT,
};

const RelationshipPhraseGroup = (React.memo<PropsT>(({
  dispatch,
  group,
  source,
  targetType,
}: PropsT) => {
  const relationships = group.relationships;
  const relationshipCount = relationships.length;

  const [isExpanded, setExpanded] = React.useState(relationshipCount <= 10);
  const [isAddDialogOpen, setAddDialogOpen] = React.useState(false);

  const addButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const closeAddDialog = React.useCallback(() => {
    setAddDialogOpen(false);
  }, [setAddDialogOpen]);

  const canBeOrdered = group.isOrderableByUser && relationships.length > 1;
  const hasOrdering = canBeOrdered && relationships.some(x => x.linkOrder);
  const maxLinkOrder =
    canBeOrdered ? max(relationships.map(r => r.linkOrder)) : 0;
  const nextLinkOrder = maxLinkOrder > 0 ? (maxLinkOrder + 1) : 0;

  const newRelationshipData = React.useMemo(() => ({
    backward: group.backward,
    entity0_id: group.backward ? null : source.id,
    entity1_id: group.backward ? source.id : null,
    linkOrder: nextLinkOrder,
    linkTypeID: group.typeId,
  }), [
    group.backward,
    group.typeId,
    source.id,
    nextLinkOrder,
  ]);

  const targetTypeSelectRef = React.useRef(null);

  const buildPopoverContent = useNewRelationshipDialogContent({
    closeDialog: closeAddDialog,
    dispatch,
    newRelationshipData,
    source,
    targetTypeSelectRef,
    title: l('Add Relationship'),
  });

  function toggleOrdering(event) {
    dispatch({
      hasOrdering: event.target.checked,
      phraseGroup: group,
      targetType,
      type: 'toggle-ordering',
    });
  }

  function handleSeeAllClick(event) {
    event.preventDefault();
    setExpanded(true);
  }

  const visibleRelationships = isExpanded
    ? relationships
    : relationships.slice(0, 10);

  return relationshipCount ? (
    <>
      <tr>
        <th>
          <label>
            {group.textPhrase ? addColonText(group.textPhrase) : (
              <span className="no-value">
                {addColonText(l('no type'))}
              </span>
            )}
          </label>
        </th>
        <td className="relationship-list">
          {visibleRelationships.map((relationship) => {
            invariant(relationship._key);
            return (
              <RelationshipItem
                canBeOrdered={canBeOrdered}
                dispatch={dispatch}
                hasOrdering={hasOrdering}
                key={relationship._key}
                relationship={relationship}
                source={source}
              />
            );
          })}
          {isExpanded ? null : (
            <p>
              <a href="#" onClick={handleSeeAllClick}>
                {texp.l(
                  'See all {num} relationships',
                  {num: relationshipCount},
                )}
              </a>
            </p>
          )}
        </td>
      </tr>
      {canBeOrdered ? (
        <tr>
          <td />
          <td>
            <label style={{padding: '6px'}}>
              <input
                defaultChecked={hasOrdering}
                onChange={toggleOrdering}
                type="checkbox"
              />
              {' '}
              {l('These relationships have a specific ordering')}
            </label>
          </td>
        </tr>
      ) : null}
      <tr>
        <td />
        <td>
          <ButtonPopover
            buildChildren={buildPopoverContent}
            buttonContent={addAnotherEntityLabels[targetType]()}
            buttonProps={{
              className: 'add-item with-label',
            }}
            buttonRef={addButtonRef}
            className="relationship-dialog"
            id="edit-relationship-dialog"
            initialFocusRef={targetTypeSelectRef}
            isDisabled={false}
            isOpen={isAddDialogOpen}
            toggle={setAddDialogOpen}
          />
        </td>
      </tr>
    </>
  ) : null;
}): React.AbstractComponent<PropsT>);

export default RelationshipPhraseGroup;
