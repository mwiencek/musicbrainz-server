FROM metabrainz/musicbrainz-server:prod

ARG MBS_ROOT=/home/musicbrainz/musicbrainz-server

RUN apk add --no-cache dcron

RUN ln -sf \
        $MBS_ROOT/docker/musicbrainz-server-cron/start.sh \
        /etc/sv/musicbrainz-server/

COPY crontab /var/spool/cron/musicbrainz
