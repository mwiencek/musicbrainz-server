/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import ButtonPopover from '../../common/components/ButtonPopover';
import {NON_URL_RELATABLE_ENTITIES} from '../../common/constants';
import {useNewRelationshipDialogContent}
  from '../hooks/useRelationshipDialogContent';
import type {
  RelationshipTargetTypeGroupsT,
  RootDispatchT,
} from '../types';

import RelationshipTargetTypeGroup from './RelationshipTargetTypeGroup';

type PropsT = {
  +dispatch: RootDispatchT,
  +source: CoreEntityT,
  +targetTypeGroups: RelationshipTargetTypeGroupsT,
};

const RelationshipTargetTypeGroups = (React.memo<PropsT>(({
  dispatch,
  source,
  targetTypeGroups,
}: PropsT): React.MixedElement => {
  const [isAddDialogOpen, setAddDialogOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const dialogTargetTypeSelectRef = React.useRef(null);
  // Remembers the most recently selected target & link types.
  const dialogTargetTypeRef =
    React.useRef<NonUrlCoreEntityTypeT | null>(null);

  const closeAddDialog = React.useCallback(() => {
    setAddDialogOpen(false);
  }, [setAddDialogOpen]);

  const buildPopoverContent = useNewRelationshipDialogContent({
    closeDialog: closeAddDialog,
    dispatch,
    source,
    targetTypeRef: dialogTargetTypeRef,
    targetTypeSelectRef: dialogTargetTypeSelectRef,
    title: l('Add Relationship'),
  });

  return (
    <>
      <legend>
        {l('Relationships')}
        <ButtonPopover
          buildChildren={buildPopoverContent}
          buttonContent={l('Add relationship')}
          buttonProps={{
            className: 'add-item with-label',
          }}
          buttonRef={addButtonRef}
          className="relationship-dialog"
          id="add-relationship-dialog"
          initialFocusRef={dialogTargetTypeSelectRef}
          isDisabled={false}
          isOpen={isAddDialogOpen}
          toggle={setAddDialogOpen}
        />
      </legend>

      <table className="details row-form" style={{width: '100%'}}>
        <tbody>
          {NON_URL_RELATABLE_ENTITIES.map((targetType) => (
            <RelationshipTargetTypeGroup
              dispatch={dispatch}
              key={targetType}
              source={source}
              targetType={targetType}
              targetTypeGroup={targetTypeGroups[targetType]}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}): React.AbstractComponent<PropsT>);

export default RelationshipTargetTypeGroups;
