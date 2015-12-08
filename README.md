# nagiosUI
Features:
* Real-time status update: no need to refresh the page to see new alerts
* XML and JSON: decreases traffic from the server few times which gives lower response time
* Actions:
  * quick acknowledgement:
    - quick acknowledged comment will be 'temp'
    - after quick acknowledgement icon will be changed to gravatar.com icon with user photo
    - quick acknowledged records are visible only in Normal tab
    - quick acknowledgement will be removed after instant acknowledgement and instant scheduling downtime
  * instant acknowledgement:
    - you must acknowledgement comment write in dialog
    - acknowledged record will be shown on Acknowledged tab
  * instant scheduling a downtime:
    - scheduling downtime comment you must write in dialog
    - scheduling downtime interval you must write/select from calendar in dialog
    - scheduled downtime record will be shown on Scheduled downtime tab
  * instant re-check:
    - record will be rechecked in Nagios
* mass operations (for grouped or searched/filtered results): quick ack, instant ack, instant scheduling a downtime, instant re-check
* Tabs (in type filters you can see count of alerts):
  - Normal (alerts that are not acknowledged and not scheduled for downtime)
  - Acknowledged (acknowledged alerts)
  - Scheduled downtime (alerts scheduled for downtime)
  - EMERGENCY (alerts with suffix "EMERGENCY")
  - Hosts (just linke to Hosts list)
* Grouping (you can turn on/off):
  - by Service: min 2 equal services
  - by Host: min 11 equal hosts
* instant real-time search/filtering
* instant javascript-based sorting
* background refresh (you can choose frequency)
* 50% percentile duration
* it shows only 1 alert if the whole host is down
* services dependency

Installation:
* you need to change htdocs/config/nagios2Config.php.example file content and rename file to nagios2Config.php:
  - $statusFile_global        = status.dat file path
  - $getNotesUrls_cacheFile   = nagios notes url file path
  - $getDepends_cacheFile     = nagios depends file path
  - $alertsPercentile_global  = nagios alerts critical 50pct file path
  - $durationsFromFile_global = nagios durations file path
  - $xmlArchive               = nagios xml output path
  - $nagiosConfigFile         = nagios config file path
  - $nagiosFullHostUrl        = nagios full host url
  - $nagiosCommentUrl         = comments url
  - $nagiosPercentileUrl      = nagios percentile file path
  - $usersArray               = user name/email array for gravatar.com icons
* you need to set up cron job:
  - * * * * * root /domain/html/misc_scripts/exclusive.php
  - nagios_percentile php /domain/admin_scripts/cron/nagios_percentile.php
  - /domain/log/nagios_percentile.log 2>&1