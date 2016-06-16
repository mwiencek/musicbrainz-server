#!/bin/sh

# Important for logging stack traces.
exec 2>&1

cd /home/musicbrainz/musicbrainz-server

source /etc/mbs_env.sh

exec carton exec -- \
    env MUSICBRAINZ_USE_PROXY=1 \
        start_server --port 5000 -- \
            plackup \
                -Ilib \
                --server Starlet \
                --env deployment \
                --max-workers $STARLET_MAX_WORKERS \
                --min-reqs-per-child 30 \
                --max-reqs-per-child 90 \
                app.psgi
