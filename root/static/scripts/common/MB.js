/*
 * @flow
 * Copyright (C) 2009 Oliver Charles
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

'use strict';

import global from '../global';

import * as constants from './constants';

/*::
import type {ExternalLinksEditor} from '../edit/externalLinks';
*/

type MBType = {
  +constants: {...},
  +Control: {...},
  +formWasPosted?: boolean,
  +GuessCase: {...},
  +sourceExternalLinksEditor?: ExternalLinksEditor,
  +text: {...},
  +utility: {...},
  ...
};

// Namespaces
const MB: MBType = {
  // Classes, common controls used throughout MusicBrainz
  Control: {},

  GuessCase: {},

  // Utility functions
  utility: {},

  // Hold translated text strings
  text: {},

  // Hold constants for knockout templates that depend on globals.
  constants,
};

global.MB = MB;

export default MB;
