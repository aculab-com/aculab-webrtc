#!/bin/bash

if ! node index.js | grep "_webRtcAccessKey:" > /dev/null; then
	echo "esm-js-basic failed"
else
	echo "esm-js-basic passed"
fi
