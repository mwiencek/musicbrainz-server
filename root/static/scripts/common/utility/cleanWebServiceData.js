// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2014 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt

// Converts JSON from /ws/2 into /ws/js-formatted data. Hopefully one day
// we'll have a standard MB data format and this won't be needed.

const _ = require('lodash');

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
  }

  if (data['artist-credit']) {
    clean.artistCredit = cleanArtistCredit(data['artist-credit']);
  }

  if (data.disambiguation) {
    clean.comment = data.disambiguation;
  }

  return clean;
}

exports.cleanArtistCredit = cleanArtistCredit;
exports.cleanWebServiceData = cleanWebServiceData;
