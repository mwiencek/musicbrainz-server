/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import isDisabledLink from '../../../../utility/isDisabledLink';
import EntityLink from '../../common/components/EntityLink';
import Relationship from '../../common/components/Relationship';
import RelationshipDiff from '../../edit/components/edit/RelationshipDiff';
import type {
  CompleteRelationshipStateT,
} from '../types';
import compareRelationships, {
  COMPARE_ENTITY_CREDITS,
} from '../utility/compareRelationships';

type PropsT = {
  +backward: boolean,
  +dispatch: ({+type: 'change-direction'}) => void,
  +newRelationship: CompleteRelationshipStateT | null,
  +oldRelationship: RelationshipT | null,
  +source: CoreEntityT,
};

const makeEntityLink = (
  entity,
  content,
  relationship,
  allowNew,
) => (
  <EntityLink
    allowNew={false}
    content={content}
    disableLink={isDisabledLink(relationship, entity)}
    entity={entity}
    showDisambiguation={false}
    target="_blank"
  />
);

const DialogPreview = (React.memo<PropsT>(({
  backward,
  dispatch,
  source,
  newRelationship,
  oldRelationship,
}: PropsT): React.Element<'fieldset'> => {
  const targetType = newRelationship?.target_type;

  function changeDirection() {
    dispatch({type: 'change-direction'});
  }

  return (
    <fieldset>
      <legend>
        {l('Preview')}
      </legend>
      {(oldRelationship && newRelationship) ? (
        compareRelationships(
          source,
          oldRelationship,
          newRelationship,
          COMPARE_ENTITY_CREDITS,
        ) ? (
          <table className="details edit-relationship">
            <tbody>
              <RelationshipDiff
                makeEntityLink={makeEntityLink}
                newRelationship={{
                  ...newRelationship,
                  backward,
                  entity0: backward ? newRelationship.target : source,
                  entity1: backward ? source : newRelationship.target,
                }}
                oldRelationship={{
                  ...oldRelationship,
                  backward,
                  entity0: backward ? oldRelationship.target : source,
                  entity1: backward ? source : oldRelationship.target,
                }}
              />
            </tbody>
          </table>
        ) : l('You haven’t made any changes!')
      ) : newRelationship ? (
        <table className="details add-relationship">
          <tbody>
            <tr>
              <th>{l('Relationship:')}</th>
              <td>
                <Relationship
                  makeEntityLink={makeEntityLink}
                  relationship={{
                    ...newRelationship,
                    backward,
                    entity0: backward ? newRelationship.target : source,
                    entity1: backward ? source : newRelationship.target,
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p>
          {l('Please fill out all required fields.')}
        </p>
      )}

      {source.entityType === targetType ? (
        <>
          {' '}
          <button
            className="styled-button change-direction"
            onClick={changeDirection}
            type="button"
          >
            {l('Change direction')}
          </button>
        </>
      ) : null}
    </fieldset>
  );
}): React.AbstractComponent<PropsT>);

export default DialogPreview;
