#!/bin/bash -u

mb_server=`dirname $0`/../..
cd $mb_server

OUTPUT=`carton exec -- ./admin/cron/slave.sh 2>&1` || echo "$OUTPUT"

OUTPUT=`
    carton exec -- ./admin/BuildIncrementalSitemaps.pl --ping --worker-count 7 2>&1
` || echo "$OUTPUT"

# eof
