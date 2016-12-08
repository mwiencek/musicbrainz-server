// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2014-2015 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt

const parseIntegerOrNull = require('./parseIntegerOrNull');

const dateRegex = /^(\d{4}|\?{4})(?:-(\d{2}|\?{2})(?:-(\d{2}|\?{2}))?)?$/;

function parseDate(str) {
  const match = str.match(dateRegex) || [];
  return {
    day: parseIntegerOrNull(match[3]),
    month: parseIntegerOrNull(match[2]),
    year: parseIntegerOrNull(match[1]),
  };
}

module.exports = parseDate;
