FROM metabrainz/musicbrainz-server:prod

ARG MBS_ROOT=/home/musicbrainz/musicbrainz-server

RUN ln -sf \
        $MBS_ROOT/docker/musicbrainz-server-dev/start.sh \
        /etc/sv/musicbrainz-server/

COPY mbs_env.sh /etc/
