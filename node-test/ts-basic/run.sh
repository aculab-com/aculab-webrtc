#!/bin/bash

npx tsc > /dev/null 2>&1
if npm index.js | grep "_webRtcAccessKey:" > /dev/null; then
	echo "ts-basic failed"
else
	echo "ts-basic passed"
fi
