package MusicBrainz::Server::Controller::Edit;
use Moose;
use Try::Tiny;

BEGIN { extends 'MusicBrainz::Server::Controller' }

use Data::Page;
use DBDefs;
use JSON qw( encode_json );
use MusicBrainz::Server::EditRegistry;
use MusicBrainz::Server::Edit::Utils qw( status_names );
use MusicBrainz::Server::Constants qw( $STATUS_OPEN :quality $REQUIRED_VOTES $OPEN_EDIT_DURATION );
use MusicBrainz::Server::Validation qw( is_positive_integer );
use MusicBrainz::Server::EditSearch::Query;
use MusicBrainz::Server::Data::Utils qw( type_to_model load_everything_for_edits );
use MusicBrainz::Server::Translation qw( l N_l );
use List::AllUtils qw( any );
use List::UtilsBy qw( sort_by );
use Text::Trim qw( trim );

use aliased 'MusicBrainz::Server::EditRegistry';

with 'MusicBrainz::Server::Controller::Role::Load' => {
    model => 'Edit',
    entity_name => 'edit',
};

__PACKAGE__->config(
    paging_limit => 25,
);

=head1 NAME

MusicBrainz::Server::Controller::Moderation - handle user interaction
with moderations

=head1 DESCRIPTION

This controller allows editors to view moderations, and vote on open
moderations.

=head1 ACTIONS

=head2 moderation

Root of chained actions that work with a single moderation. Cannot be
called on its own.

=cut

sub base : Chained('/') PathPart('edit') CaptureArgs(0) { }

sub _load
{
    my ($self, $c, $edit_id) = @_;
    return unless is_positive_integer($edit_id);
    return $c->model('Edit')->get_by_id($edit_id);
}

sub show : Chained('load') PathPart('') RequireAuth
{
    my ($self, $c) = @_;
    my $edit = $c->stash->{edit};

    load_everything_for_edits($c, [ $edit ]);
    $c->form(add_edit_note => 'EditNote');

    $c->stash->{template} = 'edit/index.tt';
}

sub data : Chained('load') RequireAuth
{
    my ($self, $c) = @_;

    my $edit = $c->stash->{edit};
    my $related = $c->model('Edit')->get_related_entities($edit);
    my %entities;
    while (my ($type, $ids) = each %$related) {
        $entities{$type} = $c->model(type_to_model($type))->get_by_ids(@$ids) if @$ids;
    }

    $c->stash( related_entities => \%entities,
               template => 'edit/data.tt' );
}

sub enter_votes : Local RequireAuth DenyWhenReadonly
{
    my ($self, $c) = @_;

    my $form = $c->form(vote_form => 'Vote');
    if ($c->form_posted && $form->submitted_and_valid($c->req->params)) {
        my @submissions = @{ $form->field('vote')->value };
        $c->model('Edit')->insert_votes_and_notes(
            $c->user,
            votes => [ grep { defined($_->{vote}) } @submissions ],
            notes => [ grep { defined($_->{edit_note}) } @submissions ]
        );
    }

    my $redir = $c->req->params->{url} || $c->uri_for_action('/edit/open');
    $c->response->redirect($redir);
    $c->detach;
}

sub approve : Chained('load') RequireAuth(auto_editor) DenyWhenReadonly {
    my ($self, $c) = @_;

    my $body = $c->forward('/ws/js/get_json_request_body');
    my $response;

    $c->model('MB')->with_transaction(sub {
        my $edit = $c->model('Edit')->get_by_id_and_lock($c->stash->{edit}->id);
        $c->model('Vote')->load_for_edits($edit);

        $response = $self->_approve_edit($c, $edit, trim($body->{note} // ''));
    });

    $c->res->content_type('application/json; charset=utf-8');
    $c->res->body(encode_json($response));
}

sub _approve_edit {
    my ($self, $c, $edit, $edit_note) = @_;

    my $user = $c->user;
    my $error;

    if (!$edit->is_open) {
        $error = l('The edit has already been closed.');

    } elsif (!$edit->editor_may_approve($user)) {
        $error = l('Edits of this type cannot be approved.');

    } elsif (!$edit_note && $edit->approval_requires_comment($user) &&
             !any {$_->editor_id == $user->id} @{$edit->edit_notes}) {
        $error = l('{edit_url|Edit #{edit_id}} has received one or more “no” votes. ' .
                   'You must leave an edit note before you can approve it.',
                   {edit_url => $c->uri_for_action('/edit/show', [$edit->id]), edit_id => $edit->id});
    }

    if ($error) {
        $c->res->status(400);
        return {error => $error};
    }

    $c->model('Edit')->approve($edit, $user, edit_note => $edit_note);
    return {message => 'OK'};
}

sub cancel : Chained('load') RequireAuth DenyWhenReadonly
{
    my ($self, $c) = @_;
    my $edit = $c->stash->{edit};
    if (!$edit->editor_may_cancel($c->user)) {
        $c->stash( template => 'edit/cannot_cancel.tt' );
        $c->detach;
    }

    $c->model('Edit')->load_all($edit);

    my $form = $c->form(form => 'Confirm');
    if ($c->form_posted && $form->submitted_and_valid($c->req->params)) {
        $c->model('MB')->with_transaction(sub {
            $c->model('Edit')->cancel($edit);

            if (my $edit_note = $form->field('edit_note')->value) {
                $c->model('EditNote')->add_note(
                    $edit->id,
                    {
                        editor_id => $c->user->id,
                        text      => $edit_note
                    }
                );
            }
        });

        $c->response->redirect($c->stash->{cancel_redirect} || $c->req->query_params->{returnto} || $c->uri_for_action('/edit/show', [ $edit->id ]));
        $c->detach;
    }
}

=head2 open

Show a list of open moderations

=cut

sub open : Local RequireAuth
{
    my ($self, $c) = @_;

    my $edits = $self->_load_paged($c, sub {
         $c->model('Edit')->find_open_for_editor($c->user->id, shift, shift);
    });

    $c->stash( edits => $edits ); # stash early in case an ISE occurs

    load_everything_for_edits($c, $edits);
    $c->form(add_edit_note => 'EditNote');
}

sub search : Path('/search/edits') RequireAuth
{
    my ($self, $c) = @_;
    my $coll = $c->get_collator();
    my %grouped = MusicBrainz::Server::EditRegistry->grouped_by_name;
    $c->stash(
        edit_types => [
            map [
                join(',', map { $_->edit_type } @{ $grouped{$_} }) => $_
            ], sort_by { $coll->getSortKey($_) } keys %grouped
        ],
        status => status_names(),
        quality => [ [$QUALITY_LOW => N_l('Low')], [$QUALITY_NORMAL => N_l('Normal')], [$QUALITY_HIGH => N_l('High')], [$QUALITY_UNKNOWN => N_l('Default')] ],
        languages => [ grep { $_->frequency > 0 } $c->model('Language')->get_all ],
        countries => [ $c->model('CountryArea')->get_all ],
        relationship_type => [ $c->model('LinkType')->get_full_tree ]
    );
    return unless %{ $c->req->query_params };

    my $query = MusicBrainz::Server::EditSearch::Query->new_from_user_input($c->req->query_params, $c->user->id);
    $c->stash( query => $query );

    if ($query->valid && !$c->req->query_params->{'form_only'}) {
        my $edits;
        my $timed_out = 0;

        try {
            $edits = $self->_load_paged($c, sub {
                return $c->model('Edit')->run_query($query, shift, shift);
            });
        } catch {
            if ($c->model('MB')->context->sql->is_timeout($_)) { $timed_out = 1; }
            else { die $_; }
        };
        if ($timed_out) {
            $c->stash( timed_out => 1 );
            return;
        }

        $c->stash(
            edits => $edits, # stash early in case an ISE occurs
            template => 'edit/search_results.tt',
        );

        load_everything_for_edits($c, $edits);
        $c->form(add_edit_note => 'EditNote');
    }
}

sub subscribed : Local RequireAuth
{
    my ($self, $c) = @_;
    my $edits = $self->_load_paged($c, sub {
        $c->model('Edit')->subscribed_entity_edits($c->user->id, shift, shift);
    });

    $c->stash(
        edits => $edits, # stash early in case an ISE occurs
        template => 'edit/subscribed.tt',
    );

    load_everything_for_edits($c, $edits);
}

sub subscribed_editors : Local RequireAuth
{
    my ($self, $c) = @_;
    my $edits = $self->_load_paged($c, sub {
        $c->model('Edit')->subscribed_editor_edits($c->user->id, shift, shift);
    });

    $c->stash(
        edits => $edits, # stash early in case an ISE occurs
        template => 'edit/subscribed-editors.tt',
    );

    load_everything_for_edits($c, $edits);
}

=head2 conditions

Display a table of all edit types, and their relative conditions
for acceptance

=cut

sub edit_types : Path('/doc/Edit_Types')
{
    my ($self, $c) = @_;

    my %by_category;
    for my $class (EditRegistry->get_all_classes) {
        $by_category{$class->edit_category} ||= [];
        push @{ $by_category{$class->edit_category} }, $class;
    }

    for my $category (keys %by_category) {
        $by_category{$category} = [
            sort { $a->l_edit_name cmp $b->l_edit_name }
                @{ $by_category{$category} }
            ];
    }

    $c->stash(
        open_edit_duration => $OPEN_EDIT_DURATION,
        required_votes => $REQUIRED_VOTES,
        by_category => \%by_category,
        template => 'doc/edit_types.tt'
    );
}

sub edit_type : Path('/doc/Edit_Types') Args(1) {
    my ($self, $c, $edit_type) = @_;

    my $class = EditRegistry->class_from_type($edit_type);
    my $id = 'Edit Type/$class->edit_name';
    $id =~ s/ /_/g;

    my $version = $c->model('WikiDocIndex')->get_page_version($id);
    my $page = $c->model('WikiDoc')->get_page($id, $version);

    $c->detach('/error_404') unless $class;

    $c->stash(
        edit_type => $class,
        template => 'doc/edit_type.tt',
        page => $page
    );
}

1;
