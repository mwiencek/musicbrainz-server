package MusicBrainz::Server::View::Default;

use strict;
use base qw(
    Catalyst::View::TT
    MusicBrainz::Server::View::Base
);
use DBDefs;
use MRO::Compat;
use Digest::MD5 qw( md5_hex );
use MusicBrainz::Server::Translation;
use Time::HiRes;

__PACKAGE__->config(TEMPLATE_EXTENSION => '.tt');

sub process {
    my $self = shift;
    my $c = $_[0];

    $c->stash->{req_view_begin_time} = Time::HiRes::time;
    $self->next::method(@_) or return 0;
    $c->stash->{req_view_end_time} = Time::HiRes::time;

    $self->_post_process(@_);
}

sub comma_list {
    my ($self, $c, $items) = @_;

    if (ref($items) ne 'ARRAY') {
        $items = [$items];
    }

    MusicBrainz::Server::Translation::comma_list(@$items);
}

sub comma_only_list {
    my ($self, $c, $items) = @_;

    if (ref($items) ne 'ARRAY') {
        $items = [$items];
    }

    MusicBrainz::Server::Translation::comma_only_list(@$items);
}

1;
