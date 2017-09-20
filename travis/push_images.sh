#!/bin/bash

docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"
docker push metabrainz/musicbrainz-test-database:"$IMAGE_TAG"
docker push metabrainz/musicbrainz-tests:"$IMAGE_TAG"
