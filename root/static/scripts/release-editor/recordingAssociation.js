// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2014 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt

const {MAX_LENGTH_DIFFERENCE} = require('../common/constants');
const {
        artistCreditFromArray,
        isCompleteArtistCredit,
        reduceArtistCredit,
    } = require('../common/immutable-entities');
const {cleanWebServiceData} = require('../common/utility/cleanWebServiceData');
const debounce = require('../common/utility/debounce');
const request = require('../common/utility/request');
const {escapeLuceneValue,
       constructLuceneField,
       constructLuceneFieldConjunction
      } = require('../common/utility/search');

(function (releaseEditor) {

    var recordingAssociation = releaseEditor.recordingAssociation = {};
    var utils = releaseEditor.utils;

    // This file contains code for finding suggested recording associations
    // in the release editor.
    //
    // Levenshtein is used to compare track & recording titles, and track
    // lengths are checked to be within 10s of recording lengths.
    //
    // Recordings from the same release group are preferred. Since there are
    // usually less than 50 recordings in a release group, we request and cache
    // all of them as soon as the release group changes. If there is no release
    // group (i.e. one isn't selected), all recordings of the selected track's
    // artists are searched using the web service.
    //
    // Direct database search is terrible at matching titles (a single
    // apostrophe changes the entire set of results), so indexed search is
    // used. To get around the 3-hour delay of indexes updating, we also GET
    // the endpoint /ws/js/last-updated-recordings, which accepts an array of
    // artist IDs and returns all unique recordings for those artists that were
    // created/updated within the last 3 hours. (It just uses the last_updated
    // column to find these.)

    var releaseGroupRecordings = ko.observable(),
        releaseGroupTimer,
        recentRecordings = [],
        trackArtistIDs = [],
        etiRegex = /(\([^)]+\) ?)*$/;


    var releaseGroupField = utils.computedWith(
        function (release) { return release.releaseGroup() }, releaseEditor.rootField.release
    );


    releaseGroupField.subscribe(function (releaseGroup) {
        if (releaseGroupTimer) clearTimeout(releaseGroupTimer);

        var getRecordings = function () {
            getReleaseGroupRecordings(releaseGroup, 0, []);
        };

        // Refresh our list of recordings every 10 minutes, in case the user
        // leaves the tab open and comes back later, potentially leaving us
        // with stale data.
        releaseGroupTimer = setTimeout(getRecordings, 10 * 60 * 1000);

        getRecordings();
    });


    debounce(utils.withRelease(function (release) {
        var newIDs = _(release.mediums()).invoke("tracks").flatten()
                      .pluck("artistCredit").invoke("names").flatten()
                      .invoke("artist").pluck("id").uniq().compact().value();

        // Check if the current set of ids is identical, to avoid triggering
        // a superfluous request below.
        var numInCommon = _.intersection(trackArtistIDs, newIDs).length;

        if (numInCommon !== trackArtistIDs.length ||
            numInCommon !== newIDs.length) {

            trackArtistIDs = newIDs;

            if (newIDs.length === 0) {
                recentRecordings = [];
                return;
            }

            var requestArgs = {
                url: "/ws/js/last-updated-recordings",
                data: $.param({ artists: newIDs }, true /* traditional */)
            };

            request(requestArgs).done(function (data) {
                recentRecordings = data.recordings;
            });
        }
    }));


    function getReleaseGroupRecordings(releaseGroup, offset, results) {
        if (!releaseGroup || !releaseGroup.gid) return;

        var query = constructLuceneField(
            [ escapeLuceneValue(releaseGroup.gid) ], "rgid"
        );

        utils.search("recording", query, 100, offset)
            .done(function (data) {
                results.push.apply(
                    results, _.map(data.recordings, cleanRecordingData)
                );

                var countSoFar = data.offset + 100;

                if (countSoFar < data.count) {
                    getReleaseGroupRecordings(releaseGroup, countSoFar, results);
                } else {
                    releaseGroupRecordings(results);
                }
            })
            .fail(function () {
                _.delay(getReleaseGroupRecordings, 5000, releaseGroup, offset, results);
            });
    }


    function recordingQuery(track, name) {
        var params = {
            recording: [ escapeLuceneValue(name) ],

            arid: _(track.artistCredit().names.toJS()).pluck("artist")
                .pluck("gid").map(escapeLuceneValue).value()
        };

        var titleAndArtists = constructLuceneFieldConjunction(params);
        var justTitle = constructLuceneField(params.recording, "recording");
        var query = "(" + titleAndArtists + ")^2 OR (" + justTitle + ")";

        var duration = parseInt(track.length(), 10);

        if (duration) {
            var a = duration - MAX_LENGTH_DIFFERENCE;
            var b = duration + MAX_LENGTH_DIFFERENCE;

            duration = utils.constructLuceneField([`[${a} TO ${b}] OR \\-`], 'dur');
            query = "(" + query + ") AND " + duration;
        }

        return query;
    }


    function cleanRecordingData(data) {
        var clean = cleanWebServiceData(data);

        clean.artist = reduceArtistCredit(artistCreditFromArray(clean.artistCredit));
        clean.video = !!data.video;

        var appearsOn = _(data.releases)
            .map(function (release) {
                // The webservice doesn't include the release group title, so
                // we have to use the release title instead.
                return {
                    name: release.title,
                    gid: release.id,
                    releaseGroupGID: release["release-group"].id
                };
            })
            .uniq(false, "releaseGroupGID").value();

        clean.appearsOn = {
            hits: appearsOn.length,
            results: appearsOn,
            entityType: "release"
        };

        // Recording entities will have already been created and cached for
        // any existing recordings on the release. However, /ws/js/release does
        // not provide any appearsOn data. So now that we have it, we can add
        // it in.
        var recording = MB.entityCache[clean.gid];

        if (recording && !recording.appearsOn) {
            recording.appearsOn = _.clone(clean.appearsOn);

            recording.appearsOn.results = _.map(recording.appearsOn.results,
                function (appearance) {
                    return MB.entity(appearance, "release");
                });
        }

        return clean;
    }


    function searchTrackArtistRecordings(track) {
        if (track._recordingRequest) {
            track._recordingRequest.abort();
            delete track._recordingRequest;
        }

        track.loadingSuggestedRecordings(true);

        var query = recordingQuery(track, track.name());

        track._recordingRequest = utils.search("recording", query)
            .done(function (data) {
                var recordings = matchAgainstRecordings(
                    track, _.map(data.recordings, cleanRecordingData)
                );

                setSuggestedRecordings(track, recordings || []);
                track.loadingSuggestedRecordings(false);
            })
            .fail(function (jqXHR, textStatus) {
                if (textStatus !== "abort") {
                    _.delay(searchTrackArtistRecordings, 5000, track);
                }
            });
    }


    // Allow the recording search autocomplete to also get better results.
    // The standard /ws/js indexed search doesn't support sending artist or
    // length info.

    recordingAssociation.autocompleteHook = function (track) {
        return function (args) {
            if (args.data.direct) return args;

            var newArgs = {
                url: "/ws/2/recording",
                data: {
                    query: recordingQuery(track, args.data.q),
                    fmt: "json"
                },
                dataType: "json"
            };

            newArgs.success = function (data) {
                // Emulate the /ws/js response format.
                var newData = _.map(data.recordings, cleanRecordingData);

                newData.push({
                    current: (data.offset / 10) + 1,
                    pages: Math.ceil(data.count / 10)
                });

                args.success(newData);
            };

            newArgs.error = args.error;
            newArgs.data.limit = 10;
            newArgs.data.offset = (args.data.page - 1) * 10;

            return newArgs;
        };
    };


    function watchTrackForChanges(track) {
        var name = track.name();
        var length = track.length();

        // We don't compare any artist credit changes, but we use the track
        // artists when searching the web service. If there are track changes
        // below but the AC is not complete, the ko.computed this is inside of
        // will re-evaluate once the user fixes the artist.
        var completeAC = isCompleteArtistCredit(track.artistCredit());

        // Only proceed if we need a recording, and the track has information
        // we can search for - this tab should be disabled otherwise, anyway.
        if (!name || !completeAC) return;

        var similarTo = function (prop) {
            return (utils.similarNames(track.name[prop], name) &&
                    utils.similarLengths(track.length[prop], length));
        };

        // The current name/length is similar to the saved name/length.
        if (similarTo("saved")) {
            track.recording(track.recording.saved);
        }
        // The current name/length is similar to the original name/length.
        else if (similarTo("original")) {
            track.recording(track.recording.original.peek());
        }
        else {
            track.recording(null);
        }
    }


    recordingAssociation.findRecordingSuggestions = function (track) {
        var releaseGroup = releaseGroupField(),
            rgRecordings;

        if (releaseGroup && releaseGroup.gid) {
            // First look in releaseGroupRecordings.
            rgRecordings = releaseGroupRecordings();

            if (!rgRecordings) {
                // If they aren't loaded yet for some reason, wait until they are.

                if (!releaseGroupRecordings.loading) {
                    releaseGroupRecordings.loading = releaseGroupRecordings.subscribe(
                        function () {
                            releaseGroupRecordings.loading.dispose();
                            delete releaseGroupRecordings.loading;

                            recordingAssociation.findRecordingSuggestions(track);
                        });
                }
                return;
            }
        }

        var recordings =
                matchAgainstRecordings(track, rgRecordings) ||
                // Next try to match against one of the recent recordings.
                matchAgainstRecordings(track, recentRecordings) ||
                // Or see if it still matches the current suggestion.
                matchAgainstRecordings(track, track.suggestedRecordings());

        if (recordings) {
            setSuggestedRecordings(track, recordings);
        } else {
            // Last resort: search all recordings of all the track's artists.
            searchTrackArtistRecordings(track);
        }
    };


    // Sets track.suggestedRecordings. If the track currently does not have
    // a recording selected, it shifts the last used recording to the top of
    // the suggestions list (if there is one).

    function setSuggestedRecordings(track, recordings) {
        var lastRecording = track.recording.saved;

        if (!track.hasExistingRecording() && lastRecording) {
            recordings = _.union([lastRecording], recordings);
        }

        track.suggestedRecordings(recordings);
    }


    function matchAgainstRecordings(track, recordings) {
        if (!recordings || !recordings.length) return;

        var trackLength = track.length();
        var trackName = track.name();

        var matches = _(recordings)
            .filter(function (recording) {
                if (!utils.similarLengths(trackLength, recording.length)) {
                    return false;
                }
                if (utils.similarNames(trackName, recording.name)) {
                    return true;
                }
                var recordingWithoutETI = recording.name.replace(etiRegex, "");

                if (utils.similarNames(trackName, recordingWithoutETI)) {
                    return true;
                }
            })
            .sortBy(function (recording) {
                var appearsOn = recording.appearsOn;
                return appearsOn ? appearsOn.results.length : 0;
            })
            .reverse()
            .sortBy(function (recording) {
                // Prefer that recordings with a length be at the top of the
                // suggestions list.
                if (!recording.length) {
                    return MAX_LENGTH_DIFFERENCE + 1;
                }
                if (!trackLength) {
                    return MAX_LENGTH_DIFFERENCE;
                }
                return Math.abs(trackLength - recording.length);
            })
            .value();

        if (matches.length) {
            return _.map(matches, function (match) {
                return MB.entity(match, "recording");
            });
        }
    }


    recordingAssociation.track = function (track) {
        debounce(function () { watchTrackForChanges(track) });
    };

}(MB.releaseEditor = MB.releaseEditor || {}));
