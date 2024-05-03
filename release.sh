#!/bin/bash

if [ -e rel ]; then
	echo "rel directory already exists"
	exit 1
fi

if [ "$1" == "" ]; then
	echo "Usage: release.sh [version]"
	exit 1
fi

tag="$1"
if [ "$tag" != "HEAD" ]; then
	if ! git tag | grep "^$tag\$" > /dev/null 2>&1; then
		echo "Tag $tag not found"
		exit 1
	fi
fi

url=`git config --get remote.origin.url`
mkdir rel
cd rel
git clone $url
cd aculab-webrtc
if [ "$tag" != "HEAD" ]; then
	git checkout "$tag"
fi
npm i
npm run build

if [ "$tag" = "HEAD" ]; then
	echo "WARNING: Built a development version.  Please tag and rebuild for to do a real release"
fi
