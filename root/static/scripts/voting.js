// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2015 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt

var $ = require('jquery');
var i18n = require('./common/i18n');

var SELECTED_CLASS = {
    '1':  'vote-yes',
    '0':  'vote-no',
    '-1': 'vote-abs'
};

$(document)
    .on('change', 'div.vote input[type=radio]', function () {
        var $radio = $(this);
        $radio.parents('.voteopts').find('.vote').attr('class', 'vote');
        $radio.parent('label').parent('.vote').addClass(SELECTED_CLASS[$radio.val()]);
    })
    .on('change', '.overall-vote input[type=radio]', function () {
        var index = $(this).parents('.vote').index();

        $('#edits .voteopts .vote:nth-child(' + index + ') input').prop('checked', true).change();
    })
    .on('click', '.edit-note-toggle', function () {
        var $button = $(this);
        var $editNote = $button.parents('.edit-list').find('.add-edit-note');
        var $editNoteField = $editNote.find('textarea');

        if ($editNote.toggle().is(':visible')) {
            $button.html(i18n.l("Delete Note"));
            $editNoteField.focus();
        } else {
            $button.html(i18n.l("Add Note"));
            $editNoteField.val('');
        }
    });

$('div.vote input:checked').change();
