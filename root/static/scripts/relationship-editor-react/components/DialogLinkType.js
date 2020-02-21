/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import expand2react from '../../common/i18n/expand2react';
import Autocomplete2, {
  createInitialState as createInitialAutocompleteState,
} from '../../common/components/Autocomplete2';
import {
  default as autocompleteReducer,
} from '../../common/components/Autocomplete2/reducer';
import type {
  Actions as AutocompleteActionT,
  Item as AutocompleteItemT,
  Props as AutocompletePropsT,
  State as AutocompleteStateT,
} from '../../common/components/Autocomplete2/types';
import bracketed from '../../common/utility/bracketed';
// $FlowIgnore[untyped-import]
import * as URLCleanup from '../../edit/URLCleanup';
import type {
  IncompleteRelationshipStateT,
} from '../types';
import autocompleteTypeFilter from '../utility/autocompleteTypeFilter';
import getRelationshipLinkType from '../utility/getRelationshipLinkType';

/* eslint-disable flowtype/sort-keys */
export type ActionT =
  | {
      +type: 'update-autocomplete',
      +action: AutocompleteActionT<LinkTypeT>,
      +source: CoreEntityT,
    };
/* eslint-enable flowtype/sort-keys */

type PropsT = {
  +dispatch: (ActionT) => void,
  +source: CoreEntityT,
  +state: StateT,
};

export type StateT = {
  +autocomplete: AutocompleteStateT<LinkTypeT>,
  +error: string,
};

export function createInitialState(
  relationship: IncompleteRelationshipStateT,
  sourceType: CoreEntityTypeT,
  targetType: NonUrlCoreEntityTypeT,
  linkTypeOptions: $ReadOnlyArray<AutocompleteItemT<LinkTypeT>>,
): StateT {
  const linkType = getRelationshipLinkType(relationship);
  return {
    autocomplete: createInitialAutocompleteState<LinkTypeT>({
      entityType: 'link_type',
      id: 'relationship-type-' + String(relationship._key),
      inputValue: (linkType?.name) ?? '',
      recentItemsKey: 'link_type-' + sourceType + '-' + targetType,
      selectedEntity: linkType,
      staticItems: linkTypeOptions,
      staticItemsFilter: autocompleteTypeFilter,
    }),
    error: '',
  };
}

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  const newState: {...StateT} = {...state};

  switch (action.type) {
    case 'update-autocomplete': {
      newState.autocomplete = autocompleteReducer(
        state.autocomplete,
        action.action,
      );

      const linkType = newState.autocomplete.selectedEntity;
      const source = action.source;

      let error = '';
      if (!linkType) {
        error = l('Please select a relationship type.');
      } else if (!linkType.description) {
        error = l(
          `Please select a subtype of the currently selected relationship
           type. The selected relationship type is only used for grouping
           subtypes.`,
        );
      } else if (linkType.deprecated) {
        error = l(
          `This relationship type is deprecated and should not be used.`,
        );
      } else if (source.entityType === 'url') {
        const checker = URLCleanup.validationRules[linkType.gid];
        if (checker && !checker(source.name)) {
          error = l(
            `This URL is not allowed for the selected link type,
             or is incorrectly formatted.`,
          );
        }
      }

      newState.error = error;
      break;
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  return newState;
}

// XXX Until Flow supports https://github.com/facebook/flow/issues/7672
const LinkTypeAutocomplete:
  React$AbstractComponent<AutocompletePropsT<LinkTypeT>, void> =
  // $FlowIgnore
  Autocomplete2;

const DialogLinkType = (React.memo<PropsT>(({
  dispatch,
  source,
  state,
}: PropsT): React.Element<'tr'> => {
  const {
    autocomplete,
    error,
  } = state;

  const linkType = autocomplete.selectedEntity;

  const [isHelpVisible, setHelpVisible] = React.useState(false);

  function toggleHelp(event) {
    event.preventDefault();
    setHelpVisible(!isHelpVisible);
  }

  const autocompleteDispatch = React.useCallback((action) => {
    dispatch({action, source, type: 'update-autocomplete'});
  }, [dispatch, source]);

  return (
    <tr>
      <td className="section">
        {addColonText(l('Type'))}
      </td>
      <td>
        <LinkTypeAutocomplete
          containerClass="relationship-type"
          dispatch={autocompleteDispatch}
          {...autocomplete}
        />
        {' '}
        {bracketed(
          <a href="#" onClick={toggleHelp}>
            {l('help')}
          </a>,
        )}
        <div aria-atomic="true" className="error" role="alert">
          {error}
        </div>
        {isHelpVisible && (linkType?.description) ? (
          <div className="ar-descr">
            {exp.l('{description} ({url|more documentation})', {
              description:
                expand2react(l_relationships(linkType.description)),
              url: {href: '/relationship/' + linkType.gid, target: '_blank'},
            })}
          </div>
        ) : null}
      </td>
    </tr>
  );
}): React.AbstractComponent<PropsT>);

export default DialogLinkType;
