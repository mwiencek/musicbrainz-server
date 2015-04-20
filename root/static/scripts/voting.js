// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2015 MetaBrainz Foundation
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt

var $ = require('jquery');
var i18n = require('./common/i18n');
var request = require('./common/utility/request');

var SELECTED_CLASS = {
    '1':  'vote-yes',
    '0':  'vote-no',
    '-1': 'vote-abs'
};

function approveEdit($edit, id, note) {
    return request({
        url: '/edit/' + id + '/approve',
        type: 'POST',
        data: JSON.stringify({note: note}),
        contentType: 'application/json; charset=utf-8'

    }).done(function () {
        $edit.remove();

    }).fail(function (jqXHR, textStatus) {
        var error;

        if (jqXHR.status == 400) {
            error = JSON.parse(jqXHR.responseText).error;
        } else {
            error = i18n.l('Error: {error}', {error: 'HTTP status code ' + jqXHR.status});
        }

        $edit.find('.edit-action-status').text(error);
    });
}

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
    })
    .on('click', '.approve-button', function (event) {
        event.preventDefault();

        var id = this.getAttribute('data-edit-id');
        var $edit = $('#edit-id-' + id);
        var $note = $('#edit-id-' + id + '-note');
        var $buttonAndNote = $(this).add($note).prop('disabled', true);

        approveEdit($edit, id, $.trim($note.val())).fail(function () {
            $buttonAndNote.prop('disabled', false);
        });
    });

$('div.vote input:checked').change();
