/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import getTargetCredit from '../../../../utility/getTargetCredit';
import relationshipDateText from '../../../../utility/relationshipDateText';
import ButtonPopover from '../../common/components/ButtonPopover';
import EntityLink from '../../common/components/EntityLink';
import {keyBy} from '../../common/utility/arrays';
import {displayLinkAttributesText}
  from '../../common/utility/displayLinkAttribute';
import {bracketedText} from '../../common/utility/bracketed';
import {getPhraseAndExtraAttributesText} from '../../edit/utility/linkPhrase';
import {
  REL_STATUS_ADD,
  REL_STATUS_EDIT,
  REL_STATUS_REMOVE,
} from '../constants';
import useRelationshipDialogContent
  from '../hooks/useRelationshipDialogContent';
import type {
  RootDispatchT,
  IncompleteRelationshipStateT,
} from '../types';
import getRelationshipLinkType from '../utility/getRelationshipLinkType';

type PropsT = {
  +canBeOrdered: boolean,
  +dispatch: RootDispatchT,
  +hasOrdering: boolean,
  +relationship: IncompleteRelationshipStateT,
  +source: CoreEntityT,
};

const RelationshipItem = (React.memo<PropsT>(({
  canBeOrdered,
  dispatch,
  hasOrdering,
  relationship,
  source,
}: PropsT): React.MixedElement => {
  const target = relationship.target;
  const isRemoved = relationship._status === REL_STATUS_REMOVE;
  let targetDisplay = null;

  if (target?.gid) {
    targetDisplay = (
      <EntityLink
        content={getTargetCredit(relationship)}
        entity={target}
      />
    );
  }

  const editButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [isDialogOpen, setDialogOpen] = React.useState(false);

  function removeRelationship() {
    dispatch({
      relationship,
      type: 'remove-relationship',
    });
  }

  function moveEntityDown() {
    dispatch({relationship, type: 'move-relationship-down'});
  }

  function moveEntityUp() {
    dispatch({relationship, type: 'move-relationship-up'});
  }

  const dateText = bracketedText(relationshipDateText(relationship, false));
  const linkType = getRelationshipLinkType(relationship);
  const attributeText = linkType ? bracketedText(
    displayLinkAttributesText(getPhraseAndExtraAttributesText(
      linkType,
      relationship.attributes,
      relationship.backward ? 'reverse_link_phrase' : 'link_phrase',
      canBeOrdered /* forGrouping */,
    )[1]),
  ) : '';

  const isIncomplete = (
    relationship.linkTypeID == null ||
    relationship.target?.id == null
  );

  const closeDialog = React.useCallback(() => {
    setDialogOpen(false);
  }, [setDialogOpen]);

  const targetTypeSelectRef = React.useRef(null);

  const buildPopoverContent = useRelationshipDialogContent({
    closeDialog,
    dispatch,
    relationship,
    source,
    targetTypeSelectRef,
    title: l('Edit Relationship'),
  });

  return (
    <>
      <div>
        <button
          className="icon remove-item"
          onClick={removeRelationship}
          type="button"
        />
        <ButtonPopover
          buildChildren={buildPopoverContent}
          buttonContent={null}
          buttonProps={{
            className: 'icon edit-item',
          }}
          buttonRef={editButtonRef}
          className="relationship-dialog"
          id="edit-relationship-dialog"
          initialFocusRef={targetTypeSelectRef}
          isDisabled={isRemoved}
          isOpen={isDialogOpen}
          toggle={setDialogOpen}
        />
        {' '}
        {hasOrdering ? (
          <>
            <button
              className="icon move-down"
              disabled={isRemoved}
              onClick={moveEntityDown}
              title={l('Move entity down')}
              type="button"
            />
            <button
              className="icon move-up"
              disabled={isRemoved}
              onClick={moveEntityUp}
              title={l('Move entity up')}
              type="button"
            />
            {' '}
          </>
        ) : null}
        {targetDisplay ? (
          <span className={getRelationshipStyling(relationship)}>
            {relationship.linkOrder ? (
              exp.l('{num}. {relationship}', {
                num: relationship.linkOrder,
                relationship: targetDisplay,
              })
            ) : targetDisplay}
          </span>
        ) : (
          <span className="no-value">
            {(target?.name) || l('no entity')}
          </span>
        )}
        {' '}
        {dateText
          ? (dateText + (attributeText ? ' ' + attributeText : ''))
          : attributeText}
      </div>

      {isIncomplete ? (
        <p className="error">
          {l(`You must select a relationship type and target entity for
              every relationship.`)}
        </p>
      ) : null}
    </>
  );
}): React.AbstractComponent<PropsT>);

function getRelationshipStyling(relationship) {
  switch (relationship._status) {
    case REL_STATUS_ADD:
      return 'rel-add';
    case REL_STATUS_EDIT:
      return 'rel-edit';
    case REL_STATUS_REMOVE:
      return 'rel-remove';
  }
  return '';
}

export default RelationshipItem;
