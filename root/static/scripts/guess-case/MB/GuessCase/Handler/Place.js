/*
 * Copyright (C) 2013 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as flags from '../../../flags';
import * as modes from '../../../modes';
import gc from '../Main';

import GuessCaseHandler from './Base';

// Place specific GuessCase functionality
class GuessCasePlaceHandler extends GuessCaseHandler {
  // Checks special cases
  checkSpecialCase() {
    return this.NOT_A_SPECIALCASE;
  }

  /*
   * Delegate function which handles words not handled
   * in the common word handlers.
   */
  doWord() {
    (
      this.doIgnoreWords() ||
      modes[gc.modeName].doWord() ||
      this.doNormalWord()
    );
    flags.context.number = false;
    return null;
  }

  // Guesses the sortname for place aliases
  guessSortName(is) {
    return this.sortCompoundName(is, this.moveArticleToEnd);
  }
}

export default GuessCasePlaceHandler;
