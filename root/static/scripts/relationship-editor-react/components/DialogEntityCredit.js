/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import {ENTITY_NAMES} from '../../common/constants';
import useEditButton from '../../edit/hooks/useEditButton';
import {stripAttributes} from '../../edit/utility/linkPhrase';
import type {
  CreditChangeOptionT,
  IncompleteRelationshipStateT,
} from '../types';

/* eslint-disable flowtype/sort-keys */
export type ActionT =
 | {+type: 'set-credit', +creditedAs: string}
 | {
     +type: 'set-credits-to-change',
     +value: CreditChangeOptionT,
   };
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +backward: boolean,
  +dispatch: (ActionT) => void,
  +entity: CoreEntityT,
  +linkType: LinkTypeT | null,
  +state: $ReadOnly<{...StateT, ...}>,
  +targetType: CoreEntityTypeT,
};

export type StateT = {
  +creditedAs: string,
  +creditsToChange: CreditChangeOptionT,
};

export function createInitialState(
  creditedAs: string,
): StateT {
  return {
    creditedAs,
    creditsToChange: '',
  };
}

export function reducer<T: $ReadOnly<{...StateT, ...}>>(
  state: T,
  action: ActionT,
): T {
  const newState: {...T, ...} = {...state};

  switch (action.type) {
    case 'set-credit': {
      newState.creditedAs = action.creditedAs;
      break;
    }
    case 'set-credits-to-change': {
      newState.creditsToChange = action.value;
      break;
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  return newState;
}

const DialogEntityCredit = (React.memo<PropsT, void>(({
  backward,
  dispatch,
  entity,
  linkType,
  state,
  targetType,
}: PropsT): React.MixedElement => {
  function handleCreditedAsChange(event) {
    dispatch({
      creditedAs: event.target.value,
      type: 'set-credit',
    });
  }

  function handleChangeCreditsChecked(event) {
    dispatch({
      type: 'set-credits-to-change',
      value: event.target.checked ? 'all' : '',
    });
  }

  function handleChangedCreditsSelection(event) {
    dispatch({
      type: 'set-credits-to-change',
      value: event.target.value,
    });
  }

  const inputRef = React.useRef(null);

  const [
    isCreditExpanded,
    handleEditButtonClick,
  ] = useEditButton(inputRef);

  return (
    <div className="entity-credit-section">
      <label className="credit-field">
        {l('Credited as:')}
        {isCreditExpanded ? (
          <>
            <br />
            <input
              onChange={handleCreditedAsChange}
              placeholder={(entity?.name) ?? ''}
              ref={inputRef}
              type="text"
              value={state.creditedAs}
            />
          </>
        ) : (
          <>
            <button
              className="icon edit-item"
              onClick={handleEditButtonClick}
              type="button"
            />
            {' '}
            {state.creditedAs}
          </>
        )}
      </label>

      {isCreditExpanded ? (
        <>
          <label className="change-credits-checkbox">
            <input
              checked={!!state.creditsToChange}
              onChange={handleChangeCreditsChecked}
              type="checkbox"
            />
            <span>
              {exp.l(
                `Change credits for other {entity} relationships
                 on the page.`,
                {entity: <bdi>{entity.name}</bdi>},
              )}
            </span>
          </label>

          {state.creditsToChange ? (
            <div className="change-credits-radio-options">
              <label>
                <input
                  checked={state.creditsToChange === 'all'}
                  name="changed-credits"
                  onChange={handleChangedCreditsSelection}
                  type="radio"
                  value="all"
                />
                {l('All of these relationships.')}
              </label>

              <label>
                <input
                  checked={state.creditsToChange === 'same-entity-types'}
                  name="changed-credits"
                  onChange={handleChangedCreditsSelection}
                  type="radio"
                  value="same-entity-types"
                />
                <span>
                  {texp.l('Only relationships to {entity_type} entities.', {
                    entity_type: ENTITY_NAMES[targetType](),
                  })}
                </span>
              </label>

              {linkType ? (
                <label>
                  <input
                    checked={
                      state.creditsToChange === 'same-relationship-type'}
                    name="changed-credits"
                    onChange={handleChangedCreditsSelection}
                    type="radio"
                    value="same-relationship-type"
                  />
                  <span>
                    {texp.l(
                      `Only “{relationship_type}” relationships to
                      {entity_type} entities.`,
                      {
                        entity_type: ENTITY_NAMES[targetType](),
                        relationship_type: stripAttributes(
                          linkType,
                          l_relationships(
                            backward
                              ? linkType.reverse_link_phrase
                              : linkType.link_phrase,
                          ),
                        ),
                      },
                    )}
                  </span>
                </label>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}): React.AbstractComponent<PropsT, void>);

export default DialogEntityCredit;
