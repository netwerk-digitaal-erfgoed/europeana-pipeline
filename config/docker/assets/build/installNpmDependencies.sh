#!/bin/bash

#exit on any error
set -e


#support passing token alone, or the content of the npmrc file
if `echo ${NPM_TOKEN} | grep --silent "//"`; then
    echo "${NPM_TOKEN}" >> ${ETL_NODE_DIR}/.npmrc
else
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> ${ETL_NODE_DIR}/.npmrc
fi


npm -v;
node -v;
yarn -v
cd ${ETL_NODE_DIR}/;
#Set NODE_ENV to dev. Otherwise we wouldnt install the dev deps, as the NODE_ENV is set to production in the main dockerfile
echo "Running \`NODE_ENV=development yarn\`"
NODE_ENV=development yarn

#cleanup of tokens
rm -f ${ETL_NODE_DIR}/.npmrc
