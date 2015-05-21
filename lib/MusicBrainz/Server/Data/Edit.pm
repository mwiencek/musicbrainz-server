package MusicBrainz::Server::Data::Edit;
use Moose;
use namespace::autoclean;

use Carp qw( carp croak confess );
use Data::Dumper::Concise;
use Data::OptList;
use DateTime;
use DateTime::Format::Pg;
use Try::Tiny;
use List::MoreUtils qw( uniq zip );
use List::AllUtils qw( any );
use MusicBrainz::Server::Data::Editor;
use MusicBrainz::Server::EditRegistry;
use MusicBrainz::Server::Edit::Exceptions;
use MusicBrainz::Server::Constants qw(
    :edit_status
    $VOTE_YES
    $AUTO_EDITOR_FLAG
    $UNTRUSTED_FLAG
    $VOTE_APPROVE
    $MINIMUM_RESPONSE_PERIOD
    $LIMIT_FOR_EDIT_LISTING
    $QUALITY_UNKNOWN_MAPPED
    $EDITOR_MODBOT
    entities_with );
use MusicBrainz::Server::Data::Utils qw( placeholders query_to_list query_to_list_limited );
use JSON::Any;
use Text::Trim qw( trim );

use aliased 'MusicBrainz::Server::Entity::Subscription::Active' => 'ActiveSubscription';
use aliased 'MusicBrainz::Server::Entity::CollectionSubscription';
use aliased 'MusicBrainz::Server::Entity::EditorSubscription';

extends 'MusicBrainz::Server::Data::Entity';

my $EDIT_IN_COLLECTION_SQL = 'edit.id IN (' .
  join(' UNION ',
       map {
           my $type = $_;
           my $coll_table = "editor_collection_${type}";
           my $edit_table = "edit_${type}";
           "SELECT ${edit_table}.edit FROM ${edit_table}
              JOIN ${coll_table} ON ${edit_table}.${type} = ${coll_table}.${type}
            WHERE ${coll_table}.collection = ?"
       } entities_with('collections')
      ) . ')';

sub _table
{
    return 'edit';
}

sub _columns
{
    return 'edit.id, edit.editor, edit.open_time, edit.expire_time, edit.close_time,
            edit.data, edit.language, edit.type, edit.yes_votes, edit.no_votes,
            edit.autoedit, edit.status, edit.quality';
}

sub _new_from_row
{
    my ($self, $row) = @_;

    # Readd the class marker
    my $class = MusicBrainz::Server::EditRegistry->class_from_type($row->{type})
        or confess"Could not look up class for type ".$row->{type};
    my $data = JSON::Any->new(utf8 => 1)->jsonToObj($row->{data});

    my $edit = $class->new({
        c => $self->c,
        id => $row->{id},
        yes_votes => $row->{yes_votes},
        no_votes => $row->{no_votes},
        editor_id => $row->{editor},
        created_time => $row->{open_time},
        expires_time => $row->{expire_time},
        auto_edit => $row->{autoedit},
        status => $row->{status},
        raw_data => $row->{data},
        quality => $row->{quality},
    });
    $edit->language_id($row->{language}) if $row->{language};
    try {
        $edit->restore($data);
    }
    catch {
        my $err = $_;
        warn $err;
        $edit->clear_data;
    };
    $edit->close_time($row->{close_time}) if defined $row->{close_time};
    return $edit;
}

sub run_query {
    my ($self, $query, $limit, $offset) = @_;
    return query_to_list_limited($self->c->sql, $offset, $limit, sub {
            return $self->_new_from_row(shift);
        }, $query->as_string, $query->arguments, $offset);
}

# Load an edit from the DB and try to get an exclusive lock on it
sub get_by_id_and_lock
{
    my ($self, $id) = @_;

    my $query =
        "SELECT " . $self->_columns . " FROM " . $self->_table . " " .
        "WHERE id = ? FOR UPDATE NOWAIT";

    my $row = $self->sql->select_single_row_hash($query, $id);
    return unless defined $row;

    my $edit = $self->_new_from_row($row);
    return $edit;
}

sub get_max_id
{
    my ($self) = @_;

    return $self->sql->select_single_value("SELECT max(id) FROM edit");
}

sub find
{
    my ($self, $p, $limit, $offset) = @_;

    my (@pred, @args);
    for my $type (entities_with('edit_table')) {
        next unless exists $p->{$type};
        my $ids = delete $p->{$type};

        my @ids = ref $ids ? @$ids : $ids;
        push @args, @ids;

        my $subquery;
        if (@ids == 1) {
            $subquery = "SELECT edit FROM edit_$type WHERE $type = ?";
        }
        else {
            my $placeholders = placeholders(@ids);
            $subquery = "SELECT edit FROM edit_$type
                          WHERE $type IN ($placeholders)
                       GROUP BY edit HAVING count(*) = ?";
            push @args, scalar @ids;
        }

        push @pred, "id IN ($subquery)";
    }

    my @params = keys %$p;
    while (my ($param, $value) = each %$p) {
        my @values = ref($value) ? @$value : ($value);
        next unless @values;
        push @pred, (join " OR ", (("$param = ?") x @values));
        push @args, @values;
    }

    my $query = 'SELECT ' . $self->_columns . ' FROM ' . $self->_table;
    $query .= ' WHERE ' . join ' AND ', map { "($_)" } @pred if @pred;
    $query .= ' ORDER BY id DESC OFFSET ? LIMIT ' . $LIMIT_FOR_EDIT_LISTING;

    return query_to_list_limited($self->c->sql, $offset, $limit, sub {
            return $self->_new_from_row(shift);
        }, $query, @args, $offset);
}

sub find_by_collection
{
    my ($self, $collection_id, $limit, $offset, $status) = @_;

    my $status_cond = '';

    $status_cond = ' AND status = ' . $status if defined($status);

    my $query = 'SELECT ' . $self->_columns . ' FROM ' . $self->_table . "
                  WHERE $EDIT_IN_COLLECTION_SQL $status_cond
                  ORDER BY edit.id DESC, edit.editor
                  OFFSET ? LIMIT $LIMIT_FOR_EDIT_LISTING";
        # XXX Postgres massively misestimates the selectivity of the "edit.id IN (...)"
        # clause, using its default value of 0.5 (i.e. every other row in the edit
        # table is expected to match), even though the row estimate for the subquery is
        # largely correct and would provide a (far lower) upper bound on the possible
        # number of matched rows in the outer query. The bogus row estimate tempts the
        # query planner into using a merge join between the subquery and the edit
        # table that for small collections (less than 500 edits) requires a scan over
        # the whole index on edit.id; in reality, a nested loop join is far faster.
        # The redundant secondary sort on edit.editor eliminates (in the view of the
        # planner) one advantage of the merge join, namely that it returns the rows
        # in the final order already, and thereby tricks the planner into preferring
        # the nested loop join.

    return query_to_list_limited($self->c->sql, $offset, $limit, sub {
            return $self->_new_from_row(shift);
        }, $query, ($collection_id) x entities_with('collections'), $offset);
}

sub find_for_subscription
{
    my ($self, $subscription) = @_;
    if ($subscription->isa(EditorSubscription)) {
        my $query = 'SELECT ' . $self->_columns . ' FROM edit
                      WHERE id > ? AND editor = ? AND status IN (?, ?)';

        return query_to_list(
            $self->c->sql,
            sub { $self->_new_from_row(shift) },
            $query, $subscription->last_edit_sent,
            $subscription->subscribed_editor_id,
            $STATUS_OPEN, $STATUS_APPLIED
        );
    }
    elsif ($subscription->isa(CollectionSubscription)) {
        return () if (!$subscription->available);

        my $query = 'SELECT ' . $self->_columns . ' FROM ' . $self->_table . "
                      WHERE $EDIT_IN_COLLECTION_SQL AND id > ? AND status IN (?, ?)";

        return query_to_list(
            $self->c->sql,
            sub { $self->_new_from_row(shift) },
            $query, ($subscription->target_id) x entities_with('collections'),
            $subscription->last_edit_sent, $STATUS_OPEN, $STATUS_APPLIED
        );
    }
    elsif ($subscription->does(ActiveSubscription)) {
        my $type = $subscription->type;
        my $query = 'SELECT ' . $self->_columns . ' FROM ' . $self->_table .
            " WHERE id IN (SELECT edit FROM edit_$type WHERE $type = ?) " .
            "   AND id > ? AND status IN (?, ?)";
        return query_to_list(
            $self->c->sql,
            sub { $self->_new_from_row(shift) },
            $query, $subscription->target_id, $subscription->last_edit_sent,
            $STATUS_OPEN, $STATUS_APPLIED
        );
    }
    else {
        return ();
    }
}

sub find_by_voter
{
    my ($self, $voter_id, $limit, $offset) = @_;
    my $query =
        'SELECT ' . $self->_columns . '
           FROM ' . $self->_table . '
           JOIN vote ON vote.edit = edit.id
          WHERE vote.editor = ? AND vote.superseded = FALSE
       ORDER BY vote_time DESC
         OFFSET ? LIMIT ' . $LIMIT_FOR_EDIT_LISTING;

    return query_to_list_limited(
        $self->sql, $offset, $limit,
        sub { $self->_new_from_row(shift) },
        $query, $voter_id, $offset
    );
}

sub find_open_for_editor
{
    my ($self, $editor_id, $limit, $offset) = @_;
    my $query =
        'SELECT ' . $self->_columns . '
           FROM ' . $self->_table . '
          WHERE status = ?
            AND NOT EXISTS (
                SELECT TRUE FROM vote
                 WHERE vote.edit = edit.id
                   AND vote.editor = ?
                   AND vote.superseded = FALSE
                )
       ORDER BY id ASC
         OFFSET ? LIMIT ' . $LIMIT_FOR_EDIT_LISTING;

    return query_to_list_limited(
        $self->sql, $offset, $limit,
        sub { $self->_new_from_row(shift) },
        $query, $STATUS_OPEN, $editor_id, $offset
    );
}

sub find_creation_edit {
   my ($self, $create_edit_type, $entity_id, %args) = @_;
   $args{id_field} ||= 'entity_id';
   my $query =
       "SELECT " . $self->_columns . "
          FROM " . $self->_table . "
        WHERE edit.status = ?
          AND edit.type = ?
          AND extract_path_value(data, ?::text) = ?
        ORDER BY edit.id ASC LIMIT 1";
   my ($edit) = query_to_list(
       $self->c->sql,
       sub { $self->_new_from_row(shift) },
       $query,
       $STATUS_OPEN, $create_edit_type, $args{id_field}, $entity_id);
   return $edit;
}

sub subscribed_entity_edits
{
    my ($self, $editor_id, $limit, $offset) = @_;

    my $columns = $self->_columns;
    my $table = $self->_table;
    my $query = "
SELECT * FROM edit, (
    SELECT edit FROM edit_artist ea
    JOIN editor_subscribe_artist esa ON esa.artist = ea.artist
    WHERE ea.status = ? AND esa.editor = ?
    UNION
    SELECT edit FROM edit_label el
    JOIN editor_subscribe_label esl ON esl.label = el.label
    WHERE el.status = ? AND esl.editor = ?
    UNION
    SELECT edit FROM (" . join(' UNION ', map {
        my $type = $_;
        my $coll_table = "editor_collection_${type}";
        my $edit_table = "edit_${type}";
        "SELECT edit, esc.editor FROM ${edit_table}
           JOIN ${coll_table} ON ${edit_table}.${type} = ${coll_table}.${type}
           JOIN editor_subscribe_collection esc ON esc.collection = ${coll_table}.collection
         WHERE esc.available"
    } entities_with('collections')) . ") ce
      JOIN edit ON ce.edit = edit.id
    WHERE edit.status = ? AND ce.editor = ?
    UNION
    SELECT edit FROM edit_series es
    JOIN editor_subscribe_series ess ON ess.series = es.series
    JOIN edit ON es.edit = edit.id
    WHERE edit.status = ? AND ess.editor = ?
) edits
WHERE edit.id = edits.edit
AND edit.status = ?
AND edit.editor != ?
AND NOT EXISTS (
    SELECT TRUE FROM vote
    WHERE vote.edit = edit.id
    AND vote.editor = ?
)
ORDER BY id ASC
OFFSET ? LIMIT $LIMIT_FOR_EDIT_LISTING";

    return query_to_list_limited(
        $self->sql, $offset, $limit,
        sub {
            return $self->_new_from_row(shift);
        },
        $query,
        ($STATUS_OPEN, $editor_id) x scalar (entities_with(['subscriptions', 'entity'])),
                                        # Above will fail if SQL is not updated
        $STATUS_OPEN, $editor_id,       # Edit is open, editor not current one
        $editor_id, $offset             # Editor has not voted, offset
    );
}

sub subscribed_editor_edits {
    my ($self, $editor_id, $limit, $offset) = @_;

    my $query =
        'SELECT ' . $self->_columns . ' FROM ' . $self->_table .
        ' WHERE status = ?
            AND editor IN (SELECT subscribed_editor FROM editor_subscribe_editor WHERE editor = ?)
            AND NOT EXISTS (
                SELECT TRUE FROM vote
                 WHERE vote.edit = edit.id
                   AND vote.editor = ?
                   AND vote.superseded = FALSE
                )
       ORDER BY id ASC
         OFFSET ? LIMIT ' . $LIMIT_FOR_EDIT_LISTING;

    return query_to_list_limited(
        $self->sql, $offset, $limit,
        sub {
            return $self->_new_from_row(shift);
        },
        $query, $STATUS_OPEN, $editor_id, $editor_id, $offset);
}

sub merge_entities
{
    my ($self, $type, $new_id, @old_ids) = @_;
    my @ids = ($new_id, @old_ids);
    $self->sql->do(
        "DELETE FROM edit_$type
         WHERE (edit, $type) IN (
             SELECT edits.edit, edits.$type
             FROM (
               SELECT * FROM edit_$type
               WHERE $type IN (" . placeholders(@ids) . ")
             ) edits,
             (
               SELECT DISTINCT ON (edit) edit, $type
               FROM edit_$type
               WHERE $type IN (" . placeholders(@ids) . ")
             ) keep
             WHERE edits.edit = keep.edit AND edits.$type != keep.$type
         )",
        @ids, @ids);

    $self->sql->do("UPDATE edit_$type SET $type = ?
              WHERE $type IN (".placeholders(@old_ids).")", $new_id, @old_ids);
}

sub _create_instance {
    my ($self, $previewing, %opts) = @_;

    my $type = delete $opts{edit_type} or croak "edit_type required";
    my $editor = delete $opts{editor};
    my $editor_id = delete $opts{editor_id};

    if ($editor_id && !$editor) {
        $editor = $self->c->model('Editor')->get_by_id($editor_id);
    }

    croak "editor required" unless $editor;

    my $class = MusicBrainz::Server::EditRegistry->class_from_type($type)
        or confess "Could not lookup edit type for $type";

    if ($previewing && !$class->does('MusicBrainz::Server::Edit::Role::Preview')) {
        warn "FIXME: $class does not support previewing.\n";
        return undef;
    }

    my $edit = $class->new(
        c => $self->c,
        editor_id => $editor->id,
        editor => $editor,
        preview => $previewing
    );

    MusicBrainz::Server::Edit::Exceptions::Forbidden->throw
        unless ($editor->id == $EDITOR_MODBOT || $edit->editor_may_edit(\%opts));

    try {
        $edit->initialize(%opts);
    } catch {
        if (ref($_) =~ /^MusicBrainz::Server::Edit::Exceptions::(NoChanges|FailedDependency)$/) {
            confess $_;
        } else {
            croak join "\n\n", "Could not create $class edit", Dumper(\%opts), $_;
        }
    };

    return $edit;
}

sub preview {
    my ($self, %opts) = @_;

    delete $opts{privileges};
    return $self->_create_instance(1, %opts);
}

sub create {
    my ($self, %opts) = @_;

    my $privs = delete $opts{privileges} || 0;

    my $edit = $self->_create_instance(0, %opts);

    my $quality = $edit->determine_quality // $QUALITY_UNKNOWN_MAPPED;
    my $conditions = $edit->edit_conditions;

    # Edit conditions allow auto edit and the edit requires no votes
    $edit->auto_edit(1)
        if ($conditions->{auto_edit} && $conditions->{votes} == 0);

    $edit->auto_edit(1)
        if ($conditions->{auto_edit} && $edit->allow_auto_edit);

    # Edit conditions allow auto edit and the user is autoeditor
    $edit->auto_edit(1)
        if ($conditions->{auto_edit} && ($privs & $AUTO_EDITOR_FLAG));

    # Unstrusted user, always go through the edit queue
    $edit->auto_edit(0)
        if ($privs & $UNTRUSTED_FLAG);

    # ModBot can override the rules sometimes
    $edit->auto_edit(1)
        if ($edit->editor_id == $EDITOR_MODBOT && $edit->modbot_auto_edit);

    # Save quality level
    $edit->quality($quality);

    # Serialize transactions per-editor. Should only be necessary for autoedits,
    # since only they update the editor table but for now we've enabled it for everything
    $self->c->model('Editor')->lock_row($edit->editor_id);

    $edit->insert;

    my $now = DateTime->now;
    my $duration = DateTime::Duration->new( days => $conditions->{duration} );

    my $row = {
        editor => $edit->editor_id,
        data => JSON::Any->new( utf8 => 1 )->objToJson($edit->to_hash),
        status => $edit->status,
        type => $edit->edit_type,
        open_time => $now,
        expire_time => $now + $duration,
        autoedit => $edit->auto_edit,
        quality => $edit->quality,
        close_time => $edit->close_time
    };

    my $edit_id = $self->c->sql->insert_row('edit', $row, 'id');
    $edit->id($edit_id);

    $edit->post_insert;
    my $post_insert_update = {
        data => JSON::Any->new( utf8 => 1 )->objToJson($edit->to_hash),
        status => $edit->status,
        type => $edit->edit_type,
    };

    $self->c->sql->update_row('edit', $post_insert_update, { id => $edit_id });

    $edit->adjust_edit_pending(+1) unless $edit->auto_edit;

    my $ents = $edit->related_entities;
    while (my ($type, $ids) = each %$ents) {
        $ids = [ uniq grep { defined } @$ids ];
        @$ids or next;
        my $query = "INSERT INTO edit_$type (edit, $type) VALUES ";
        $query .= join ", ", ("(?, ?)") x @$ids;
        my @all_ids = ($edit_id) x @$ids;
        $self->c->sql->do($query, zip @all_ids, @$ids);
    }

    # Automatically accept auto-edits on insert
    $edit = $self->get_by_id($edit->id);
    if ($edit->auto_edit) {
        $self->accept($edit, auto_edit => 1);
    }

    $edit = $self->get_by_id($edit->id);

    return $edit;
}

sub load_all
{
    my ($self, @edits) = @_;

    @edits = grep { $_->has_data } @edits;

    my $objects_to_load  = {}; # Objects loaded with get_by_id
    my $post_load_models = {}; # Objects loaded with ->load(after get_by_id)

    for my $edit (@edits) {
        my $edit_references = $edit->foreign_keys;
        while (my ($model, $ids) = each %$edit_references) {
            $objects_to_load->{$model} ||= [];
            if (ref($ids) eq 'ARRAY') {
                $ids = [ uniq grep { defined } @$ids ];
            }
            $ids = Data::OptList::mkopt_hash($ids);
            while (my ($object_id, $extra_models) = each %$ids) {
                push @{ $objects_to_load->{$model} }, $object_id;
                if ($extra_models && @$extra_models) {
                    if (!exists $post_load_models->{$model}->{$object_id}) {
                        $post_load_models->{$model}->{$object_id} = $extra_models;
                    } else {
                        for my $extra_model (@$extra_models) {
                            push @{ $post_load_models->{$model}->{$object_id} }, $extra_model
                              unless (any { $_ eq $extra_model } @{ $post_load_models->{$model}->{$object_id} });
                        }
                    }
                }
            }
        }
    }

    default_includes($objects_to_load, $post_load_models);

    my $loaded = {};
    my $load_arguments = {};
    while (my ($model, $ids) = each %$objects_to_load) {
        my $m = ref $model ? $model : $self->c->model($model);
        $loaded->{$model} = $m->get_by_ids(@$ids);

        # Now we need to load any extra information about each object
        for my $id (@$ids) {
            for my $extra (@{ $post_load_models->{$model}->{$id} }) {
                $load_arguments->{$extra} ||= [];
                push @{ $load_arguments->{$extra} }, $loaded->{$model}->{$id};
            }
        }
    }

    while (my ($models, $objs) = each %$load_arguments) {
        # $models may be a list of space-separated models to be chain-loaded;
        # i.e. "ModelA ModelB" means to first load via ModelA for the current
        # set of objects, then via ModelB for the result of the first load.
        my @objects = @$objs;
        foreach my $model (split / /, $models) {
            @objects = grep { defined $_ } @objects;
            # ArtistMeta, ReleaseMeta, etc are special models that indicate
            # loading via Artist->load_meta, Release->load_meta, and so on.
            # AreaContainment is another special model for loading via
            # Area->load_containment.
            if ($model =~ /^(.*)Meta$/) {
                $self->c->model($1)->load_meta(@objects);
                @objects = (); # returns no objects
            }
            elsif ($model eq 'AreaContainment') {
                $self->c->model('Area')->load_containment(@objects);
                @objects = (); # returns no objects
            }
            else {
                @objects = $self->c->model($model)->load(@objects);
            }
        }
    }

    for my $edit (@edits) {
        $edit->display_data($edit->build_display_data($loaded));
    }
}

sub default_includes {
    # Additional models that should automatically be included with a model.
    # NB: A list, not a hash, because order may be important.
    my @includes = (
        'Place' => 'Area',
        'Area' => 'AreaContainment',
    );

    my ($objects_to_load, $post_load_models) = @_;
    while (my ($to, $add) = splice @includes, 0, 2) {
        # Add as a post-load model to top-level models
        for my $id (@{ $objects_to_load->{$to} // [] }) {
            $post_load_models->{$to}->{$id} ||= [];
            push @{ $post_load_models->{$to}->{$id} }, $add
              unless (any { $_ =~ /^$add(?: .*|)$/ } @{ $post_load_models->{$to}->{$id} });
        }

        # Add to existing post-load models
        for my $id (values %$post_load_models) {
            for my $models (values %$id) {
                for my $entry (@$models) {
                    $entry .= ' ' . $add if $entry =~ /^(?:.* |)$to$/;
                }
            }
        }
    }
}

# Must be called in a transaction
sub approve {
    my ($self, $edit, $editor, %opts) = @_;

    $self->c->model('Vote')->enter_votes(
        $editor,
        {
            vote    => $VOTE_APPROVE,
            edit_id => $edit->id
        }
    );

    if (my $edit_note = trim($opts{edit_note} // '')) {
        $self->c->model('EditNote')->add_note($edit->id, {editor_id => $editor->id, text => $edit_note});
    }

    # Apply the changes and close the edit
    $self->accept($edit);
}

sub _do_accept
{
    my ($self, $edit) = @_;

    my $status = try {
        $edit->accept;
        return $STATUS_APPLIED;
    }
    catch {
        my $err = $_;
        if (ref($err) eq 'MusicBrainz::Server::Edit::Exceptions::FailedDependency') {
            $self->c->model('EditNote')->add_note(
                $edit->id => {
                    editor_id => $EDITOR_MODBOT,
                    text => $err->message
                }
            );
            return $STATUS_FAILEDDEP;
        }
        elsif (ref($err) eq 'MusicBrainz::Server::Edit::Exceptions::GeneralError') {
            $self->c->model('EditNote')->add_note(
                $edit->id => {
                    editor_id => $EDITOR_MODBOT,
                    text => $err->message
                }
            );
            return $STATUS_ERROR;
        }
        elsif (ref($err) eq 'MusicBrainz::Server::Edit::Exceptions::NoLongerApplicable') {
            $self->c->model('EditNote')->add_note(
                $edit->id => {
                    editor_id => $EDITOR_MODBOT,
                    text => $err->message
                }
            );
            return $STATUS_ERROR;
        }
        else {
            die $err;
        }
    };

    return $status;
}

sub _do_reject
{
    my ($self, $edit, $status) = @_;

    $status = try {
        $edit->reject;
        return $status;
    }
    catch {
        my $err = $_;
        if (ref($err) eq 'MusicBrainz::Server::Edit::Exceptions::MustApply') {
            $self->c->model('EditNote')->add_note(
                $edit->id,
                {
                    editor_id => $EDITOR_MODBOT,
                    text => $err
                 }
            );
            return $STATUS_APPLIED;
        }
        else {
             carp("Could not reject " . $edit->id . ": $err");
             return $STATUS_ERROR;
        }
    };
    return $status;
}

# Must be called in a transaction
sub accept
{
    my ($self, $edit, %opts) = @_;

    confess "The edit is not open anymore." if $edit->status != $STATUS_OPEN;
    $self->_close($edit, sub { $self->_do_accept(shift) }, %opts);
}

# Must be called in a transaction
sub reject
{
    my ($self, $edit, $status) = @_;
    $status ||= $STATUS_FAILEDVOTE;
    confess "The edit is not open anymore."
        unless $edit->status == $STATUS_TOBEDELETED || $edit->status == $STATUS_OPEN;

    $self->_close($edit, sub { $self->_do_reject(shift, $status) });
}

sub cancel
{
    my ($self, $edit) = @_;
    $self->reject($edit, $STATUS_DELETED);
}

sub _close
{
    my ($self, $edit, $close_sub, %opts) = @_;
    my $status = &$close_sub($edit);
    my $query = "UPDATE edit SET status = ?, close_time = NOW() WHERE id = ?";
    $self->c->sql->do($query, $status, $edit->id);
    $edit->adjust_edit_pending(-1) unless $edit->auto_edit;
    $edit->status($status);
    $self->c->model('Editor')->credit($edit->editor_id, $status, %opts);
}

sub insert_votes_and_notes {
    my ($self, $editor, %data) = @_;
    my @votes = @{ $data{votes} || [] };
    my @notes = @{ $data{notes} || [] };

    # Filter out approvals, they can only be entered via the approve method
    @votes = grep { $_->{vote} != $VOTE_APPROVE } @votes;

    Sql::run_in_transaction(sub {
        $self->c->model('Vote')->enter_votes($editor, @votes);

        my $edits = $self->get_by_ids(map { $_->{edit_id} } @notes);
        for my $note (@notes) {
            my $edit_id = $note->{edit_id};
            my $edit = $edits->{$edit_id};
            defined $edit && $edit->editor_may_add_note($editor)
                or next;
            $self->c->model('EditNote')->add_note(
                $edit_id,
                {
                    editor_id => $editor->id,
                    text => $note->{edit_note},
                });
        }
    }, $self->c->sql);
}

sub get_related_entities {
    my ($self, $edit) = @_;
    my %result;
    for my $type (entities_with('edit_table')) {
        my $query = "SELECT $type AS id FROM edit_$type WHERE edit = ?";
        $result{$type} = [ query_to_list($self->c->sql, sub { shift->{id} }, $query, $edit->id) ];
    }
    return \%result;
}

sub add_link {
    my ($self, $type, $id, $edit) = @_;
    $self->sql->do("INSERT INTO edit_$type (edit, $type) VALUES (?, ?)", $edit, $id);
}

sub extend_expiration_time {
    my ($self, @ids) = @_;
    my $interval = DateTime::Format::Pg->format_interval($MINIMUM_RESPONSE_PERIOD);
    $self->sql->do("UPDATE edit SET expire_time = NOW() + interval ?
        WHERE id = any(?) AND expire_time < NOW() + interval ?", $interval, \@ids, $interval);
}

__PACKAGE__->meta->make_immutable;
no Moose;

1;

=head1 COPYRIGHT

Copyright (C) 2009 Oliver Charles

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.

=cut
