package MusicBrainz::Server::CacheWrapper::Redis;

use Encode;
use Moose;
use Redis;
use Storable;

has '_connection' => (
    is => 'rw',
    isa => 'Redis',
);

has '_namespace' => (
    is => 'rw',
    isa => 'Str',
);

sub BUILD {
    my ($self, $args) = @_;

    $self->_connection(Redis->new(
        encoding => undef,
        reconnect => 60,
        server => $args->{server},
    ));

    $self->_namespace($args->{namespace});
}

sub _prepare_key {
    my ($self, $key) = @_;

    encode('utf-8', $self->_namespace . $key);
}

sub get {
    my ($self, $key) = @_;

    my $value = $self->_connection->get($self->_prepare_key($key));
    return ${Storable::thaw($value)} if defined $value;
    return;
}

sub get_multi {
    my ($self, @keys) = @_;

    my @values = $self->_connection->mget(map { $self->_prepare_key($_) } @keys);
    my $i = 0;
    my %result;
    for my $key (@keys) {
        my $value = $values[$i++];
        $result{$key} = ${Storable::thaw($value)} if defined $value;
    }
    return \%result;
}

sub set {
    my ($self, $key, $value, $exptime) = @_;

    my @args = ($self->_prepare_key($key), Storable::nfreeze(\$value));
    push @args, 'EX', $exptime if defined $exptime;
    $self->_connection->set(@args);
    return;
}

sub set_multi {
    my ($self, @items) = @_;

    for (@items) {
        my ($key, $value, $exptime) = @$_;
        my @args = ($self->_prepare_key($key), Storable::nfreeze(\$value));
        push @args, 'EX', $exptime if defined $exptime;
        $self->_connection->set(@args, sub {});
    }
    $self->_connection->wait_all_responses;
    return;
}

sub delete {
    my ($self, $key) = @_;

    $self->_connection->del($self->_prepare_key($key));
    return;
}

sub remove {
    my ($self, $key) = @_;

    $self->delete($self->_prepare_key($key));
}

sub delete_multi {
    my ($self, @keys) = @_;

    $self->_connection->del(map { $self->_prepare_key($_) } @keys);
    return;
}

__PACKAGE__->meta->make_immutable;

no Moose;

1;

=head1 COPYRIGHT

Copyright (C) 2016 MetaBrainz Foundation

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
