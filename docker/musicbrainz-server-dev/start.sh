#!/bin/sh

source /etc/mbs_service_helpers.sh
cd "$MBS_ROOT"
exec carton exec -- plackup -Ilib -r
