FROM alpine:3.4

COPY \
    docker/docker-helpers/install_consul_template.sh \
    docker/docker-helpers/install_runit.sh \
    /usr/local/bin/

RUN install_consul_template.sh && \
    rm /usr/local/bin/install_consul_template.sh

RUN apk add --no-cache \
        ca-certificates \
        db \
        expat \
        gettext \
        git \
        icu \
        libpq \
        nodejs \
        openssl \
        perl \
        postgresql-client \
        postgresql-dev && \
    apk add --no-cache --virtual .build-deps \
        db-dev \
        expat-dev \
        g++ \
        gcc \
        icu-dev \
        libxml2-dev \
        make \
        musl-dev \
        openssl-dev \
        perl-dev \
        wget

RUN wget -q -O - https://cpanmin.us | perl - App::cpanminus && \
    cpanm Carton

# XXX HACK! See https://github.com/Leont/crypt-rijndael/issues/11
RUN sed -i -e 's~#include <bits/alltypes.h>~\0\ntypedef unsigned int __uint32_t;\ntypedef unsigned char __uint8_t;~' /usr/include/sys/types.h

RUN adduser -D -s /bin/sh musicbrainz
USER musicbrainz

ARG MBS_ROOT=/home/musicbrainz/musicbrainz-server
RUN mkdir -p $MBS_ROOT
WORKDIR $MBS_ROOT

COPY package.json npm-shrinkwrap.json ./

RUN npm install --only=production

COPY cpanfile ./

ENV PERL_CPANM_OPT --notest --no-interactive
RUN carton install

COPY ./ ./

# https://github.com/docker/docker/issues/6119
USER root

RUN mkdir -p /tmp/ttc && \
    chown -R musicbrainz:musicbrainz \
        /home/musicbrainz/musicbrainz-server \
        /tmp/ttc

USER musicbrainz

# None of these commands should require DBDefs.pm, since it doesn't exist yet.
# It's generated after the container starts, via consul-template.
RUN carton exec -- make -C po all_quiet && \
    carton exec -- make -C po deploy

USER root

RUN apk del .build-deps

RUN ln -s \
        $MBS_ROOT/docker/musicbrainz-server/mbs_env.sh \
        $MBS_ROOT/docker/musicbrainz-server/consul-template.conf \
        $MBS_ROOT/docker/musicbrainz-server/mbs_service_helpers.sh \
        /etc/ && \
    # Note: this is the BusyBox ln, which follows symlinks by default.
    ln -s /etc/mbs_env.sh /etc/consul_template_env.sh && \
    mkdir -p /etc/sv/musicbrainz-server && \
    ln -s \
        $MBS_ROOT/docker/musicbrainz-server/musicbrainz-server.service \
        /etc/sv/musicbrainz-server/run && \
    ln -s \
        $MBS_ROOT/docker/musicbrainz-server/start.sh \
        /etc/sv/musicbrainz-server/ && \
    ln -s /etc/sv/musicbrainz-server /etc/service/

ENTRYPOINT ["/usr/local/bin/runsvinit"]
