#!/usr/bin/env perl

use strict;
use warnings;
use FindBin;
use lib "$FindBin::Bin/../lib";
use DBDefs;
use Readonly;

Readonly our @BOOLEAN_DEFS => qw(
    DEVELOPMENT_SERVER
);

Readonly our @NUMBER_DEFS => qw(
    RENDERER_PORT
);

Readonly our @STRING_DEFS => qw(
    MB_LANGUAGES
    REDIS_SERVER
    REDIS_NAMESPACE
    STATIC_RESOURCES_LOCATION
);

my $code = '';

for my $def (@BOOLEAN_DEFS) {
    my $value = DBDefs->$def;

    if (defined $value && $value eq '1') {
        $value = 'true';
    } else {
        $value = 'false';
    }

    $code .= "exports.$def = $value;\n";
}

for my $def (@NUMBER_DEFS) {
    my $value = DBDefs->$def // 'null';
    $code .= "exports.$def = $value;\n";
}

for my $def (@STRING_DEFS) {
    my $value = DBDefs->$def;

    if (!defined $value) {
        $value = "''";
    } else {
        $value =~ s/\\/\\\\/g;
        $value =~ s/'/\\'/g;
        $value = "'$value'";
    }

    $code .= "exports.$def = $value;\n";
}

my $js_path = "$FindBin::Bin/../root/static/scripts/common/DBDefs.js";
open(my $fh, '>', $js_path);
print $fh $code;
