#!/bin/bash -u

mb_server=`dirname $0`/../..
cd $mb_server

OUTPUT=`carton exec -- ./admin/BuildSitemaps.pl --ping` || echo "$OUTPUT"

# eof
