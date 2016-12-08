// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2014 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt

// Converts JSON from /ws/2 into /ws/js-formatted data. Hopefully one day
// we'll have a standard MB data format and this won't be needed.

const _ = require('lodash');

const {l} = require('../i18n');
const formatDate = require('./formatDate');
const parseDate = require('./parseDate');

function cleanArtistCreditName(data) {
  return {
    artist: {
      gid: data.artist.id,
      name: data.artist.name,
      sortName: data.artist["sort-name"],
      entityType: 'artist',
    },
    name: data.name || data.artist.name,
    joinPhrase: data.joinphrase || ""
  };
}

function cleanArtistCredit(data) {
  return _.map(data, cleanArtistCreditName);
}

function cleanWebServiceData(data) {
  var clean = { gid: data.id, name: data.name || data.title };

  if (data.length) {
    clean.length = data.length;
  }

  if (data['sort-name']) {
    clean.sortName = data['sort-name'];
    clean.sort_name = clean.sortName;
  }

  if (data['artist-credit']) {
    clean.artistCredit = cleanArtistCredit(data['artist-credit']);
    clean.artist_credit = clean.artistCredit;
  }

  if (data.disambiguation) {
    clean.comment = data.disambiguation;
  }

  return clean;
}

function cleanLifeSpan(data, target) {
  const lifeSpan = data['life-span'];
  if (lifeSpan) {
    target.begin_date = parseDate(lifeSpan.begin || '');
    target.begin_date.toString = formatDate.bind(null, target.begin_date);
    target.end_date = parseDate(lifeSpan.end || '');
    target.end_date.toString = formatDate.bind(null, target.end_date);
    target.ended = !!lifeSpan.ended;
  }
}

function cleanType(data, target) {
  if (data.type) {
    target.type = {name: data.type, l_name: l(data.type)};
  }
}

function cleanArea(data) {
  const area = cleanWebServiceData(data);

  area.containment = [];
  area.entity_type = 'area';
  area.entityType = 'area';
  area.iso_3166_1_codes = data['iso-3166-1-codes'] || [];
  area.iso_3166_2_codes = data['iso-3166-2-codes'] || [];
  area.iso_3166_3_codes = data['iso-3166-3-codes'] || [];

  cleanLifeSpan(data, area);
  cleanType(data, area);

  return area;
}

function cleanArtist(data) {
  const artist = cleanWebServiceData(data);

  artist.entity_type = 'area';
  artist.entityType = 'area';

  cleanLifeSpan(data, artist);
  cleanType(data, artist);

  let gender = data.gender;
  if (gender) {
    // XXX The search server returns the gender name as lower case.
    gender = _.capitalize(gender);
    artist.gender = {name: gender, l_name: l(gender)};
  }

  ['area', 'begin-area', 'end-area'].forEach(function (key) {
    const areaData = data[key];
    if (areaData) {
      artist[_.snakeCase(key)] = cleanArea(areaData);
    }
  });

  return artist;
}

function cleanResult(cleanEntity, data) {
  return {entity: cleanEntity(data), score: data.score};
}

function cleanWebServiceResults(results, entityType) {
  switch (entityType) {
    case 'area':
    case 'artist':
      return results.map(cleanResult.bind(
        null,
        eval('clean' + _.capitalize(entityType))
      ));
    default:
      return results;
  }
}

exports.cleanArtistCredit = cleanArtistCredit;
exports.cleanWebServiceData = cleanWebServiceData;
exports.cleanWebServiceResults = cleanWebServiceResults;
