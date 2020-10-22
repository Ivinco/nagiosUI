#!/bin/sh

dir=`dirname "$0"`
cd "$dir"
while [ 1 ]; do
	php cron.php >> /boardreader/log/mnu.log 2>&1
	sleep 5
done
