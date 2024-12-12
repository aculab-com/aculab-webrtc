#!/bin/bash

if ! node index.cjs | grep "_webRtcAccessKey:" > /dev/null; then
	echo "cjs-basic failed"
else
	echo "cjs-basic passed"
fi
