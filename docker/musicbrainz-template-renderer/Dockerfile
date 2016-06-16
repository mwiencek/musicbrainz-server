FROM metabrainz/musicbrainz-server:prod

ARG MBS_ROOT=/home/musicbrainz/musicbrainz-server

RUN ln -sf \
        $MBS_ROOT/docker/musicbrainz-template-renderer/start.sh \
        /etc/sv/musicbrainz-server/
