// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2011-2014 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt
//
// The 'base64' function contained in this file is derived from:
// http://stringencoders.googlecode.com/svn-history/r210/trunk/javascript/base64.js
// Original version Copyright (C) 2010 Nick Galbreath, and released under
// the MIT license: http://opensource.org/licenses/MIT

const _ = require('lodash');

const {MAX_LENGTH_DIFFERENCE, MIN_NAME_SIMILARITY} = require('../common/constants');
const request = require('../common/utility/request');
const similarity = require('../edit/utility/similarity');

(function (releaseEditor) {

    var utils = releaseEditor.utils = {};


    utils.mapChild = function (parent, children, type) {
        return _.map(children || [], function (data) {
            return type(data, parent);
        });
    };


    utils.computedWith = function (callback, observable, defaultValue) {
        return ko.computed(function () {
            var result = observable();
            return result ? callback(result) : defaultValue;
        });
    };


    utils.withRelease = function (read, defaultValue) {
        return utils.computedWith(read, releaseEditor.rootField.release, defaultValue);
    };


    utils.unformatTrackLength = function (duration) {
        if (!duration) {
            return null;
        }

        if (duration.slice(-2) == 'ms') {
            return parseInt(duration, 10);
        }

        var parts = duration.replace(/[:\.]/, ':').split(':');
        if (parts[0] == '?' || parts[0] == '??' || duration === '') {
            return null;
        }

        var seconds = parseInt(parts.pop(), 10);
        var minutes = parseInt(parts.pop() || 0, 10) * 60;
        var hours = parseInt(parts.pop() || 0, 10) * 3600;

        return (hours + minutes + seconds) * 1000;
    };


    // Webservice helpers

    utils.reuseExistingMediumData = function (data) {
        // When reusing an existing medium, we don't want to keep its id or
        // its cdtocs, since neither of those will be shared. However, if we
        // haven't loaded the tracks yet, we retain the id as originalID so we
        // can request them later.
        var newData = _.omit(data, "id", "cdtocs");

        if (data.id) newData.originalID = data.id;

        return newData;
    };


    // Metadata comparison utilities.

    function lengthsAreWithin10s(a, b) {
        return Math.abs(a - b) <= MAX_LENGTH_DIFFERENCE;
    }

    function namesAreSimilar(a, b) {
        return similarity(a, b) >= MIN_NAME_SIMILARITY;
    }

    utils.similarNames = function (oldName, newName) {
        return oldName == newName || namesAreSimilar(oldName, newName);
    };

    utils.similarLengths = function (oldLength, newLength) {
        // If either of the lengths are empty, we can't compare them, so we
        // consider them to be "similar" for recording association purposes.
        return !oldLength || !newLength || lengthsAreWithin10s(oldLength, newLength);
    };


    utils.calculateDiscID = function (toc) {
        var info = toc.split(/\s/);

        var temp = paddedHex(info.shift(), 2) + paddedHex(info.shift(), 2);

        for (var i = 0; i < 100; i++) {
            temp += paddedHex(info[i], 8);
        }

        return base64(rstr_sha1(temp));
    };

    function paddedHex(str, length) {
        return _.padLeft((parseInt(str, 10) || 0).toString(16).toUpperCase(), length, '0');
    }

    // The alphabet has been modified and does not conform to RFC822.
    // For an explanation, see http://wiki.musicbrainz.org/Disc_ID_Calculation

    var padchar = "-";
    var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._";

    function base64(s) {
        var i, b10;
        var x = [];
        var imax = s.length - s.length % 3;

        for (i = 0; i < imax; i += 3) {
            b10 = (s.charCodeAt(i) << 16) | (s.charCodeAt(i + 1) << 8) | s.charCodeAt(i + 2);
            x.push(alpha.charAt(b10 >> 18));
            x.push(alpha.charAt((b10 >> 12) & 0x3F));
            x.push(alpha.charAt((b10 >> 6) & 0x3F));
            x.push(alpha.charAt(b10 & 0x3F));
        }

        switch (s.length - imax) {
            case 1:
                b10 = s.charCodeAt(i) << 16;
                x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
                       padchar + padchar);
                break;
            case 2:
                b10 = (s.charCodeAt(i) << 16) | (s.charCodeAt(i + 1) << 8);
                x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
                       alpha.charAt((b10 >> 6) & 0x3F) + padchar);
                break;
        }

        return x.join("");
    }

}(MB.releaseEditor = MB.releaseEditor || {}));

module.exports = MB.releaseEditor.utils;
