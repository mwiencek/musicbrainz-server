package MusicBrainz::Server::Controller::Explore;

use Moose;
use MusicBrainz::Server::Translation qw( l lp );
use MusicBrainz::Server::Constants qw( entities_with );
use MusicBrainz::Server::Form::Utils qw(
    select_options
    script_options
    language_options
    build_grouped_options
);
use JSON;

BEGIN { extends 'MusicBrainz::Server::Controller' }

sub explore : Path('')
{
    my ($self, $c) = @_;

    my @entities = entities_with(['mbid' , 'relatable']);

    my %type_info = map {
        $_ => [map +{ name => $_->name, l_name => $_->l_name },
                             $c->model($_)->get_all]
    } qw(
        ArtistType
        Gender
        ReleaseGroupType
        ReleaseGroupSecondaryType
        ReleaseStatus
        MediumFormat
        PlaceType
        LabelType
        WorkType
        EventType
        SeriesType
        InstrumentType
    );

    my @countries_hash = select_options($c, 'CountryArea', serializer => sub { { value => $_[0]->id, label => $_[0]->l_name, code => $_[0]->iso_3166_1 } });

    my @languages_hash = build_grouped_options($c, language_options($c));

    my @scripts_hash = build_grouped_options($c, script_options($c)),

    my $json = JSON->new->utf8(0);
    $c->stash(
        template => 'explore/index.tt',
        entity => $json->encode(\@entities),
        country => $json->encode(\@countries_hash),
        language => $json->encode(\@languages_hash),
        script => $json->encode(\@scripts_hash),
        type_info => $json->encode(\%type_info)
        );
}

1;

=head1 LICENSE

Copyright (C) 2015 Thanuditha Ruchiranga

This software is provided "as is", without warranty of any kind, express or
implied, including  but not limited  to the warranties of  merchantability,
fitness for a particular purpose and noninfringement. In no event shall the
authors or  copyright  holders be  liable for any claim,  damages or  other
liability, whether  in an  action of  contract, tort  or otherwise, arising
from,  out of  or in  connection with  the software or  the  use  or  other
dealings in the software.

GPL - The GNU General Public License    http://www.gnu.org/licenses/gpl.txt
Permits anyone the right to use and modify the software without limitations
as long as proper  credits are given  and the original  and modified source
code are included. Requires  that the final product, software derivate from
the original  source or any  software  utilizing a GPL  component, such  as
this, is also licensed under the GPL license.

=cut
