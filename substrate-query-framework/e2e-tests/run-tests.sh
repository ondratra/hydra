#!/bin/bash

cleanup()
{
  (echo "## Processor Logs ##" && docker logs e2e-tests_processor_1 --tail 50) || :
  (echo "## Processor Server Logs ##" && docker logs e2e-tests_processor-gql-server_1 --tail 50) || :  
  (echo "## Indexer Logs ##" && docker logs e2e-tests_indexer_1 --tail 50) || :  
  (echo "## Indexer API Server ##" && docker logs e2e-tests_indexer-api-server_1 --tail 50) || :  
  yarn post-e2e-test
}

set -e
# clean up
trap cleanup ERR EXIT SIGINT SIGTERM

docker build ../index-builder -t index-builder:latest 
docker build ../cli -t hydra-cli:latest 
docker build ./schema -t hydra:latest
docker build ../index-server -t indexer-api-gateway:latest
# setup db's
yarn pre-e2e-test

sleep 10s

# wait for the indexer api to start 
attempt_counter=0
max_attempts=50

until $(curl -s --head  --request GET http://localhost:4001/graphql | grep "400" > /dev/null);  do
    if [ ${attempt_counter} -eq ${max_attempts} ];then
      echo "Max attempts reached"
      break
    fi

    printf '.'
    attempt_counter=$(($attempt_counter+1))
    sleep 5
done

# run the actual tests
yarn e2e-test