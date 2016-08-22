#!/usr/bin/env perl

use strict;
use warnings;
use FindBin;
use lib "$FindBin::Bin/../lib";
use DBDefs;
use Readonly;

Readonly our @EXPORTED_DEFS => qw(
    STATIC_RESOURCES_LOCATION
);

my $code = '';
for my $def (@EXPORTED_DEFS) {
    my $value = DBDefs->$def;
    $value =~ s/\\/\\\\/g;
    $value =~ s/'/\\'/g;
    $code .= "exports.$def = '$value';\n";
}

my $js_path = "$FindBin::Bin/../root/static/scripts/common/DBDefs.js";
open(my $fh, '>', $js_path);
print $fh $code;
