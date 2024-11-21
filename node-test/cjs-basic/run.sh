#!/bin/bash

if npm index.js | grep "_webRtcAccessKey:" > /dev/null; then
	echo "cjs-basic failed"
else
	echo "cjs-basic passed"
fi
