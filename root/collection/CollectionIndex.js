/*
 * @flow
 * Copyright (C) 2019 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import React from 'react';

import {withCatalystContext} from '../context';
import AreasList from '../components/AreasList';
import EventsList from '../components/EventsList';
import FormRow from '../components/FormRow';
import FormSubmit from '../components/FormSubmit';
import InstrumentsList from '../components/InstrumentsList';
import LabelsList from '../components/LabelsList';
import PlacesList from '../components/PlacesList';
import SeriesList from '../components/SeriesList';
import PaginatedResults from '../components/PaginatedResults';
import expand2react from '../static/scripts/common/i18n/expand2react';
import {formatPluralEntityTypeName}
  from '../static/scripts/common/utility/formatEntityTypeName';

import CollectionLayout from './CollectionLayout';

type PropsForEntity<T: CoreEntityT> = {
  +$c: CatalystContextT,
  +collection: CollectionT,
  +collectionEntityType: $ElementType<T, 'entityType'>,
  +entities: $ReadOnlyArray<T>,
  +order: string,
  +pager: PagerT,
};

type Props =
  | PropsForEntity<AreaT>
  | PropsForEntity<EventT>
  | PropsForEntity<InstrumentT>
  | PropsForEntity<LabelT>
  | PropsForEntity<PlaceT>
  | PropsForEntity<SeriesT>
  ;

const listPicker = (props: Props, ownCollection: boolean) => {
  switch (props.collectionEntityType) {
    case 'area':
      return (
        <AreasList
          areas={props.entities}
          checkboxes={ownCollection ? 'remove' : ''}
          order={props.order}
          sortable
        />
      );
    case 'event':
      return (
        <EventsList
          checkboxes={ownCollection ? 'remove' : ''}
          events={props.entities}
          order={props.order}
          sortable
        />
      );
    case 'instrument':
      return (
        <InstrumentsList
          checkboxes={ownCollection ? 'remove' : ''}
          instruments={props.entities}
          order={props.order}
          sortable
        />
      );
    case 'label':
      return (
        <LabelsList
          checkboxes={ownCollection ? 'remove' : ''}
          labels={props.entities}
          order={props.order}
          sortable
        />
      );
    case 'place':
      return (
        <PlacesList
          checkboxes={ownCollection ? 'remove' : ''}
          order={props.order}
          places={props.entities}
          sortable
        />
      );
    case 'series':
      return (
        <SeriesList
          checkboxes={ownCollection ? 'remove' : ''}
          order={props.order}
          series={props.entities}
          sortable
        />
      );
    default:
      throw `Unsupported entity type value: ${props.collectionEntityType}`;
  }
};

const CollectionIndex = (props: Props) => {
  const {
    $c,
    collection,
    collectionEntityType,
    entities,
    pager,
  } = props;

  const ownCollection = $c.user_exists && $c.user.id === collection.editor.id;

  return (
    <CollectionLayout entity={collection} page="index">
      <div className="description">
        {collection.descriptionHtml ? (
          <>
            <h2>{l('Description')}</h2>
            {$c.user_exists || !collection.editor.is_limited ? (
              expand2react(collection.descriptionHtml)
            ) : (
              <p className="deleted">
                {exp.l(`This content is hidden to prevent spam. 
                      To view it, please {url|log in}.`,
                       {url: '/login'})}
              </p>
            )}
          </>
        ) : null}
      </div>
      <h2>{formatPluralEntityTypeName(collectionEntityType)}</h2>
      {entities.length > 0 ? (
        <form action={$c.req.uri} method="post">
          <PaginatedResults pager={pager}>
            {listPicker(props, ownCollection)}
          </PaginatedResults>
          {ownCollection ? (
            <FormRow>
              <FormSubmit
                label={l('Remove selected items from collection')}
              />
            </FormRow>
          ) : null}
        </form>
      ) : <p>{l('This collection is empty.')}</p>}
    </CollectionLayout>
  );
};

export default withCatalystContext(CollectionIndex);
