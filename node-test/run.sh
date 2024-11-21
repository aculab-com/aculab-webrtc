#!/bin/bash

for d in cjs-basic esm-js-basic ts-basic; do
	pushd $d
	npm link ../.. > /dev/null 2>&1
	./run.sh
	popd
done
