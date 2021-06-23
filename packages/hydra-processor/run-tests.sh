#!/bin/bash

set -e

cleanup() {
    #docker-compose -f docker-compose-test.yml down
    #(yarn post-e2e-test) || :
    echo 'cleanup'
}

# start docker
docker-compose -f docker-compose-test.yml up -d

# prepare processor config
export DB_USER=postgres
export DB_PASS=postgres
export WARTHOG_INTROSPECTION=true
export WARTHOG_SUBSCRIPTIONS=true
export WARTHOG_PLAYGROUND=true
export WARTHOG_DB_SYNCHRONIZE=false
export WARTHOG_DB_OVERRIDE=false
export WARTHOG_DB_DATABASE=query_node_processor
export WARTHOG_DB_USERNAME=postgres
export WARTHOG_DB_PASSWORD=postgres
export WARTHOG_DB_HOST=localhost
export WARTHOG_DB_PORT=5432
export WARTHOG_APP_PORT=4002
export WARTHOG_APP_HOST=localhost
export NODE_ENV=development


# build processor
yarn
yarn build

# prepare clean database
yarn warthog db:drop
yarn warthog db:create
yarn warthog db:migrate

# run processor
yarn run-dev run --manifest test/fixtures/manifest.yml
# run tests
yarn test:run

trap cleanup EXIT
