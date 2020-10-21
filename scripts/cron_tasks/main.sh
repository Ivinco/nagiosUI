#!/bin/sh

dir=`dirname "$0"`
cd "$dir"
while [ 1 ]; do
	php cron.php
	sleep 5
done
