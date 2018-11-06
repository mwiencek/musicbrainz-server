/*
 * @flow
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import React from 'react';

import {CatalystContext, withCatalystContext} from '../context';
import {l} from '../static/scripts/common/i18n';
import Annotation from '../static/scripts/common/components/Annotation';
import WikipediaExtract
  from '../static/scripts/common/components/WikipediaExtract';
import CritiqueBrainzLinks from '../components/CritiqueBrainzLinks';
import CritiqueBrainzReview
  from '../static/scripts/common/components/CritiqueBrainzReview';
import PaginatedResults from '../components/PaginatedResults';
import TaggerIcon from '../static/scripts/common/components/TaggerIcon';
import loopParity from '../utility/loopParity';
import EntityLink from '../static/scripts/common/components/EntityLink';
import FormRow from '../components/FormRow';
import FormSubmit from '../components/FormSubmit';
import Relationships from '../components/Relationships';
import ReleaseDates from '../components/ReleaseDates';
import ReleaseCountries from '../components/ReleaseCountries';
import ReleaseLabelList from '../components/ReleaseLabelList';
import ReleaseCatnoList from '../components/ReleaseCatnoList';
import formatBarcode from '../static/scripts/common/utility/formatBarcode';
import * as manifest from '../static/manifest';

import ReleaseGroupLayout from './ReleaseGroupLayout';

type Props = {|
  +$c: CatalystContextT,
  +eligibleForCleanup: boolean,
  +mostPopularReview: CritiqueBrainzReviewT,
  +mostRecentReview: CritiqueBrainzReviewT,
  +numberOfRevisions: number,
  +pager: PagerT,
  +releaseGroup: ReleaseGroupT,
  +releases: $ReadOnlyArray<$ReadOnlyArray<ReleaseT>>,
  +wikipediaExtract: WikipediaExtractT,
|};

function buildReleaseStatusTable(releaseStatusGroup) {
  const status = releaseStatusGroup[0].status;
  return (
    <>
      <tr className="subh">
        <CatalystContext.Consumer>
          {($c: CatalystContextT) => (
            $c.user_exists
              ? <th />
              : null
          )}
        </CatalystContext.Consumer>
        <CatalystContext.Consumer>
          {($c: CatalystContextT) => (
            <th colSpan={$c.session && $c.session.tport ? 9 : 8}>
              {status && status.name
                ? lp_attributes(status.name, 'release_status')
                : l('(unknown)')}
            </th>
          )}
        </CatalystContext.Consumer>
      </tr>
      {releaseStatusGroup.map((release, index) => (
        <tr className={loopParity(index)} key={release.id}>
          <CatalystContext.Consumer>
            {($c: CatalystContextT) => (
              $c.user_exists
                ? (
                  <td>
                    <input
                      name="add-to-merge"
                      type="checkbox"
                      value={release.id}
                    />
                  </td>
                ) : null
            )}
          </CatalystContext.Consumer>
          <td>
            <EntityLink entity={release} />
          </td>
          <td>{release.combined_format_name || l('[missing media]')}</td>
          <td>{release.combined_track_count || '-'}</td>
          <td>
            <ReleaseDates events={release.events} />
          </td>
          <td>
            <ReleaseCountries events={release.events} />
          </td>
          <td>
            <ReleaseLabelList labels={release.labels} />
          </td>
          <td>
            <ReleaseCatnoList labels={release.labels} />
          </td>
          <td className="barcode-cell">{formatBarcode(release.barcode)}</td>
          <CatalystContext.Consumer>
            {($c: CatalystContextT) => (
              $c.session && $c.session.tport
                ? <td><TaggerIcon entity={release} /></td>
                : null
            )}
          </CatalystContext.Consumer>
        </tr>
      ))}
    </>
  );
}

const ReleaseGroupIndex = ({
  $c,
  eligibleForCleanup,
  pager,
  mostPopularReview,
  mostRecentReview,
  numberOfRevisions,
  releaseGroup,
  releases,
  wikipediaExtract,
}: Props) => (
  <ReleaseGroupLayout entity={releaseGroup} page="index">
    {eligibleForCleanup ? (
      <p className="cleanup">
        {l(
          `This release group has no relationships or releases associated,
           and will be removed automatically in the next few days. If this
           is not intended, please add more data to this release group.`,
        )}
      </p>
    ) : null
    }
    <Annotation
      annotation={releaseGroup.latest_annotation}
      collapse
      entity={releaseGroup}
      numberOfRevisions={numberOfRevisions}
    />
    <WikipediaExtract
      cachedWikipediaExtract={wikipediaExtract ? wikipediaExtract : null}
      entity={releaseGroup}
    />
    {releases.length ? (
      <>
        {releaseGroup.typeName ? <h2>{l(releaseGroup.typeName)}</h2> : null}
        <form action="/release/merge_queue" method="post">
          <PaginatedResults pager={pager}>
            <table className="tbl">
              <thead>
                <tr>
                  {$c.user_exists
                    ? <th className="pos"><input type="checkbox" /></th>
                    : null}
                  <th>{l('Release')}</th>
                  <th>{l('Format')}</th>
                  <th>{l('Tracks')}</th>
                  <th>{l('Date')}</th>
                  <th>{l('Country')}</th>
                  <th>{l('Label')}</th>
                  <th>{l('Catalog#')}</th>
                  <th>{l('Barcode')}</th>
                  {$c.session && $c.session.tport
                    ? <th>{l('Tagger')}</th> : null}
                </tr>
              </thead>
              <tbody>
                {releases.map(buildReleaseStatusTable)}
              </tbody>
            </table>
          </PaginatedResults>
          {$c.user_exists ? (
            <FormRow>
              <FormSubmit label={l('Add selected releases for merging')} />
            </FormRow>
          ) : null}
        </form>
      </>
    ) : (
      <p>{l('No releases found.')}</p>
    )}
    <Relationships source={releaseGroup} />
    {releaseGroup.review_count === null ? null : (
      <>
        <h2>{l('CritiqueBrainz Reviews')}</h2>
        <CritiqueBrainzLinks releaseGroup={releaseGroup} />
        <div id="critiquebrainz-reviews">
          {mostRecentReview ? (
            <CritiqueBrainzReview
              review={mostRecentReview}
              title={l('Most Recent')}
            />
          ) : null}
          {mostPopularReview &&
            mostPopularReview.id !== mostRecentReview.id ? (
              <CritiqueBrainzReview
                review={mostPopularReview}
                title={l('Most Popular')}
              />
            ) : null}
        </div>
      </>
    )}
    {manifest.js('release-group/index.js', {async: 'async'})}
  </ReleaseGroupLayout>
);

export default withCatalystContext(ReleaseGroupIndex);

