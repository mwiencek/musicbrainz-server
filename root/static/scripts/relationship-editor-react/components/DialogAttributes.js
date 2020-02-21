/*
 * @flow
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import {compare} from '../../common/i18n';
import expand2react from '../../common/i18n/expand2react';
import linkedEntities from '../../common/linkedEntities';
import bracketed from '../../common/utility/bracketed';
import clean from '../../common/utility/clean';
import type {
  LinkAttributesByRootIdT,
} from '../types';
import getAttributeKey from '../utility/getAttributeKey';

import BooleanAttribute, {
  type ActionT as BooleanAttributeActionT,
  type StateT as BooleanAttributeStateT,
  reducer as booleanAttributeReducer,
} from './DialogAttribute/BooleanAttribute';
import MultiselectAttribute, {
  type ActionT as MultiselectAttributeActionT,
  type StateT as MultiselectAttributeStateT,
  reducer as multiselectAttributeReducer,
  createMultiselectAttributeValue,
} from './DialogAttribute/MultiselectAttribute';
import TextAttribute, {
  type ActionT as TextAttributeActionT,
  type StateT as TextAttributeStateT,
  reducer as textAttributeReducer,
} from './DialogAttribute/TextAttribute';

/* eslint-disable flowtype/sort-keys */
export type ActionT =
  | {
      +type: 'update-boolean-attribute',
      +rootKey: number,
      +action: BooleanAttributeActionT,
    }
  | {
      +type: 'update-multiselect-attribute',
      +rootKey: number,
      +action: MultiselectAttributeActionT,
    }
  | {
      +type: 'update-text-attribute',
      +rootKey: number,
      +action: TextAttributeActionT,
    }
  | {
      +type: 'toggle-help',
    };
/* eslint-enable flowtype/sort-keys */

type DialogAttributeT =
  | BooleanAttributeStateT
  | MultiselectAttributeStateT
  | TextAttributeStateT;

type DialogAttributesT = $ReadOnlyArray<DialogAttributeT>;

type PropsT = {
  +dispatch: (ActionT) => void,
  +state: $ReadOnly<{...StateT, ...}>,
};

export type StateT = {
  +attributesList: DialogAttributesT,
  +isAttributesHelpVisible: boolean,
  +resultingLinkAttributes: $ReadOnlyArray<LinkAttrT>,
};

const DIALOG_ATTRIBUTE_ORDER = {
  checkbox: 1,
  multiselect: 3,
  text: 2,
};

export function createDialogAttributesList(
  linkType: LinkTypeT | null,
  existingAttributesByRootId: LinkAttributesByRootIdT | null,
): DialogAttributesT {
  const dialogAttributes = [];

  if (linkType) {
    for (const typeId in linkType.attributes) {
      const linkTypeAttribute = linkType.attributes[+typeId];
      const rootAttributeType = linkedEntities.link_attribute_type[typeId];

      if (__DEV__) {
        invariant(
          rootAttributeType.id === rootAttributeType.root_id,
          'expected a root link attribute type, got ' + JSON.stringify({
            id: rootAttributeType.id,
            root_id: rootAttributeType.root_id,
          }),
        );
      }

      let dialogAttribute: DialogAttributeT;
      const sharedProps = {
        error: '',
        key: getAttributeKey(),
        max: linkTypeAttribute.max,
        min: linkTypeAttribute.min,
        type: rootAttributeType,
      };

      const existingAttributes =
        existingAttributesByRootId?.[rootAttributeType.id];

      if (rootAttributeType.children) {
        dialogAttribute = {
          control: 'multiselect',
          linkType,
          // Shows at least one empty input by default.
          values: (existingAttributes ?? [{credited_as: '', type: null}])
            .map((linkAttr) => (
              createMultiselectAttributeValue(
                rootAttributeType,
                linkAttr.type,
                linkAttr.credited_as,
              )
            )),
          ...sharedProps,
        };
      } else if (rootAttributeType.free_text) {
        if (__DEV__) {
          invariant(
            !existingAttributes || (existingAttributes.length <= 1),
            'only one free-text attribute is supported at present',
          );
        }
        const existingAttribute = existingAttributes?.length
          ? existingAttributes[0]
          : null;

        dialogAttribute = {
          control: 'text',
          textValue: (existingAttribute?.text_value) ?? '',
          ...sharedProps,
        };
      } else {
        if (__DEV__) {
          invariant(
            !existingAttributes || (existingAttributes.length <= 1),
            'only one boolean attribute is supported at present',
          );
        }
        dialogAttribute = {
          control: 'checkbox',
          enabled: existingAttributes != null,
          ...sharedProps,
        };
      }
      dialogAttributes.push(dialogAttribute);
    }
  }

  dialogAttributes.sort((a, b) => (
    /*
     * The make the UI a bit cleaner, group attributes with the same
     * controls together (checkboxes first, then text attributes, then
     * multiselects).
     */
    ((DIALOG_ATTRIBUTE_ORDER[a.control] ?? 0) -
      (DIALOG_ATTRIBUTE_ORDER[b.control] ?? 0)) ||
    compare(a.type.l_name ?? '', b.type.l_name ?? '')
  ));

  return dialogAttributes;
}

export function createInitialState(
  linkType: LinkTypeT | null,
  existingAttributesByRootId: LinkAttributesByRootIdT | null,
): StateT {
  const attributesList = createDialogAttributesList(
    linkType,
    existingAttributesByRootId,
  );
  return {
    attributesList,
    isAttributesHelpVisible: false,
    resultingLinkAttributes: getLinkAttributesFromState(attributesList),
  };
}

export function getLinkAttributesFromState(
  attributesList: DialogAttributesT,
): $ReadOnlyArray<LinkAttrT> {
  return attributesList.reduce(
    (accum, attributeState) => {
      switch (attributeState.control) {
        case 'checkbox': {
          if (attributeState.enabled) {
            const linkAttributeType = attributeState.type;
            accum.push({
              type: {
                gid: linkAttributeType.gid,
              },
              typeID: linkAttributeType.id,
              typeName: linkAttributeType.name,
            });
          }
          break;
        }
        case 'multiselect': {
          for (const valueAttribute of attributeState.values) {
            if (valueAttribute.removed) {
              continue;
            }
            const linkAttributeType =
              valueAttribute.typeAutocomplete.selectedEntity;
            if (linkAttributeType) {
              accum.push({
                credited_as: clean(valueAttribute.creditedAs),
                type: {
                  gid: linkAttributeType.gid,
                },
                typeID: linkAttributeType.id,
                typeName: linkAttributeType.name,
              });
            }
          }
          break;
        }
        case 'text': {
          const linkAttributeType = attributeState.type;
          const textValue = clean(attributeState.textValue);

          if (nonEmpty(textValue)) {
            accum.push({
              text_value: textValue,
              type: {
                gid: linkAttributeType.gid,
              },
              typeID: linkAttributeType.id,
              typeName: linkAttributeType.name,
            });
          }
          break;
        }
      }
      return accum;
    },
    [],
  );
}

export function reducer(
  state: StateT,
  action: ActionT,
): StateT {
  switch (action.type) {
    case 'toggle-help': {
      return {
        ...state,
        isAttributesHelpVisible: !state.isAttributesHelpVisible,
      };
    }
  }

  const newState: {...StateT} = {...state};

  switch (action.type) {
    case 'update-boolean-attribute': {
      newState.attributesList = newState.attributesList.map((x) => {
        if (x.key === action.rootKey) {
          invariant(x.control === 'checkbox');
          return booleanAttributeReducer(x, action.action);
        }
        return x;
      });
      break;
    }
    case 'update-multiselect-attribute': {
      newState.attributesList = newState.attributesList.map((x) => {
        if (x.key === action.rootKey) {
          invariant(x.control === 'multiselect');
          return multiselectAttributeReducer(x, action.action);
        }
        return x;
      });
      break;
    }
    case 'update-text-attribute': {
      newState.attributesList = newState.attributesList.map((x) => {
        if (x.key === action.rootKey) {
          invariant(x.control === 'text');
          return textAttributeReducer(x, action.action);
        }
        return x;
      });
      break;
    }
    default: {
      /*:: exhaustive(action); */
      throw new Error('Unknown action: ' + action.type);
    }
  }

  newState.resultingLinkAttributes = getLinkAttributesFromState(
    newState.attributesList,
  );

  return newState;
}

const DialogAttributes = (React.memo<PropsT>(({
  dispatch,
  state,
}: PropsT): React.MixedElement | null => {
  function handleHelpClick(event) {
    event.preventDefault();
    dispatch({type: 'toggle-help'});
  }

  const booleanAttributeDispatch = React.useCallback((rootKey, action) => {
    dispatch({
      action,
      rootKey,
      type: 'update-boolean-attribute',
    });
  }, [dispatch]);

  const multiselectAttributeDispatch = React.useCallback(
    (rootKey, action) => {
      dispatch({
        action,
        rootKey,
        type: 'update-multiselect-attribute',
      });
    },
    [dispatch],
  );

  const textAttributeDispatch = React.useCallback((rootKey, action) => {
    dispatch({
      action,
      rootKey,
      type: 'update-text-attribute',
    });
  }, [dispatch]);

  return state.attributesList.length ? (
    <fieldset>
      <legend>
        {l('Attributes')}
        {' '}
        {bracketed(
          <a href="#" onClick={handleHelpClick}>
            {l('help')}
          </a>,
        )}
      </legend>

      {state.attributesList.map((attribute) => {
        let attributeElement;
        switch (attribute.control) {
          case 'checkbox': {
            attributeElement = (
              <BooleanAttribute
                dispatch={booleanAttributeDispatch}
                state={attribute}
              />
            );
            break;
          }
          case 'multiselect': {
            attributeElement = (
              <MultiselectAttribute
                dispatch={multiselectAttributeDispatch}
                state={attribute}
              />
            );
            break;
          }
          case 'text': {
            attributeElement = (
              <TextAttribute
                dispatch={textAttributeDispatch}
                state={attribute}
              />
            );
            break;
          }
        }

        return (
          <div
            className={'attribute-container ' + attribute.control}
            key={attribute.key}
          >
            {attributeElement}
            {attribute.error}
            {(
              state.isAttributesHelpVisible &&
              attribute.type.l_name
            ) ? (
              <div className="ar-descr">
                {expand2react(attribute.type.l_name)}
              </div>
              ) : null}
          </div>
        );
      })}
    </fieldset>
  ) : null;
}): React.AbstractComponent<PropsT>);

export default DialogAttributes;
