#!/bin/bash

cd src/shared
npm link

# install concourse
cd ../concourse/node_modules
ls -1 | grep -v '^app$' | xargs rm -rf
cd ..
npm install --cache-min=999999
npm link taut.shared

cd ../gangway
rm -rf node_modules/
npm install --cache-min=999999
npm link taut.shared

cd ../precheck
rm -rf node_modules/
npm install --cache-min=999999

cd ../tarmac
rm -rf node_modules/
npm install --cache-min=999999
npm link taut.shared

cd ../tower
rm -rf node_modules/
npm install --cache-min=999999
npm link taut.shared
