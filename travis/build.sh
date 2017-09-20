#!/bin/bash

make -C docker config

export IMAGE_TAG="${TRAVIS_PULL_REQUEST_BRANCH:-$TRAVIS_BRANCH}"

CACHE_FROM=""
if [[ ! -z "$TRAVIS_PULL_REQUEST_BRANCH" ]]; then
    # Uses && so that CACHE_FROM is only set if the pulls were succesful.
    docker pull metabrainz/musicbrainz-tests:"$TRAVIS_PULL_REQUEST_BRANCH" &&
    docker pull metabrainz/musicbrainz-test-database:"$TRAVIS_PULL_REQUEST_BRANCH" &&
    CACHE_FROM="$TRAVIS_PULL_REQUEST_BRANCH"
fi

if [[ -z "$CACHE_FROM" ]]; then
    docker pull metabrainz/musicbrainz-tests:"$TRAVIS_BRANCH" &&
    docker pull metabrainz/musicbrainz-test-database:"$TRAVIS_BRANCH" &&
    CACHE_FROM="$TRAVIS_BRANCH"
fi

export CACHE_FROM
docker-compose -f docker/docker-compose.tests.yml up -d --build
