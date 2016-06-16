export DEPLOY_ENV := dev

.PHONY: all up build

all: build up

up:
	docker-compose -f docker-compose.$(DEPLOY_ENV).yml -p musicbrainz-server up

build:
	docker build -t metabrainz/musicbrainz-server:prod ../
	docker build -t metabrainz/musicbrainz-server:beta musicbrainz-server-beta/
	docker build -t metabrainz/musicbrainz-server:dev musicbrainz-server-dev/
	docker build -t metabrainz/musicbrainz-server-cron musicbrainz-server-cron/
	docker build -t metabrainz/musicbrainz-template-renderer:prod musicbrainz-template-renderer/
	docker build -t metabrainz/musicbrainz-template-renderer:beta musicbrainz-template-renderer-beta/
