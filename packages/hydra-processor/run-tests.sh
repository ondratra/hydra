#!/bin/bash

set -e

cleanup() {
    # kill processor instance
    yarn pm2 stop processorProcess > /dev/null

    # turn off docker containers
    docker-compose -f docker-compose-test.yml down
}

# start docker
docker-compose -f docker-compose-test.yml up -d db # start database
echo "starting db, please wait"
sleep 5 # wait for db to startup
docker-compose -f docker-compose-test.yml up -d

# prepare processor config
export DB_USER=postgres
export DB_PASS=postgres
export INDEXER_ENDPOINT_URL=http://localhost:4002/graphql

# build processor
yarn
yarn build

# generate warthog files (needed for db migration)
#yarn warthog generate myTestTry

#THIS_DIR_PATH=`dirname "$(readlink -f "$0")"`
#echo "hydra-cli codegen --no-install --schema \"${THIS_DIR_PATH}/test/schema.graphql\""
#hydra-cli codegen --no-install --schema "${THIS_DIR_PATH}/test/schema.graphql"
##exit 1
#
## prepare clean database
##yarn warthog db:drop
##yarn warthog db:create
##yarn warthog db:migrate
#
#cd generated/graphql-server
#yarn db:drop
#yarn db:create
#cd ../..

# prepare db
yarn run-dev migrate

# running via pm2 is needed to prevent node (sub)process from surviving `kill -9`
echo "yarn run-dev run --manifest test/fixtures/manifest.yml" > tmp.sh # prepare script that can be run by pm2
yarn pm2 start --name processorProcess tmp.sh > /dev/null
rm tmp.sh # delete temporary script file

# run tests
yarn test:run

trap cleanup EXIT
