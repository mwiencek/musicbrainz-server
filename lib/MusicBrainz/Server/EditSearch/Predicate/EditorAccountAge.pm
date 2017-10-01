package MusicBrainz::Server::EditSearch::Predicate::EditorAccountAge;

use DateTime::Format::Pg;
use Moose;
use namespace::autoclean;
use feature 'switch';

no if $] >= 5.018, warnings => 'experimental::smartmatch';

with 'MusicBrainz::Server::EditSearch::Predicate';

sub operator_cardinality_map {
    return (
        BETWEEN => '2',
        map { $_ => 1 } qw( < > ),
    );
}

sub combine_with_query {
    my ($self, $query) = @_;

    my $age = '(now() - member_since)';

    my $sql;
    given ($self->operator) {
        when ('BETWEEN') {
            $sql = $age . ' BETWEEN SYMMETRIC interval ? AND interval ?';
        }
        default {
           $sql = join(' ', $age, $self->operator, 'interval ?');
       }
    }

    $query->add_join('JOIN editor ON editor.id = edit.editor');
    $query->add_where([$sql, $self->sql_arguments]);
}

sub valid {
    my $self = shift;

    my $cardinality = $self->operator_cardinality($self->operator) or return 1;
    for my $arg_index (1..$cardinality) {
        my $arg = $self->argument($arg_index - 1);
        eval { $arg = DateTime::Format::Pg->parse_interval($arg) };
        return 0 if ($@ || !$arg);
    }

    return 1;
}

1;
