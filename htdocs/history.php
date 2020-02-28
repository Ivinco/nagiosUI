<?php

include_once __DIR__ . '/../scripts/init.php';

$server   = (isset($_GET['server'])    && $_GET['server'])    ? $_GET['server']    : '';
$date     = (isset($_GET['date'])      && $_GET['date'])      ? $_GET['date']      : '';
$list     = (isset($_GET['list'])      && $_GET['list'])      ? $_GET['list']      : '';
$timeCorrectionType = (isset($_GET['time_correction_type'])) ? $_GET['time_correction_type'] : '';
$timeCorrectionDiff = ($timeCorrectionType == 'browser' && isset($_GET['time_correction_diff'])) ? $_GET['time_correction_diff'] : 0;
$timeCorrectionDiffTmp = (isset($_GET['time_correction_diff'])) ? $_GET['time_correction_diff'] : 0;

ob_start('ob_gzhandler');
header('Content-Type: application/json');

if ($list) {
    $return = returnTabsList($serversList);
    $return['groupByService'] = 2;
    $return['groupByHost'] = 11;
    $return['refreshArray'] = [
        [ 'value' =>  '10', 'name' => '10 sec' ],
        [ 'value' =>  '20', 'name' => '20 sec' ],
        [ 'value' =>  '40', 'name' => '40 sec' ],
        [ 'value' =>  '60', 'name' =>  '1 min' ],
        [ 'value' => '120', 'name' =>  '2 min' ],
        [ 'value' => '180', 'name' =>  '3 min' ],
        [ 'value' => '300', 'name' =>  '5 min' ],
        [ 'value' => '600', 'name' => '10 min' ],
    ];

    echo json_encode($return);
    http_response_code(200);
    die;
}

if (!$date) {
    http_response_code(400);
    die('date must be set. Date format: "1970-01-01 00:00:00" or timestamp');
}

if ($date && !validateDate($date)) {
    http_response_code(400);
    die('date format must be: "1970-01-01 00:00:00" or timestamp');
}

$db       = new db;
$history  = [];
$servers  = returnServers($server, $serversList);
$date     = (isTimestamp($date)) ? returnDateForDb($date) : $date;

foreach ($servers as $item) {
    $history[$item] = $db->historyGetUnfinishedAlertsWithDate($item, $date);
}

$all = [
    'normal' => [],
    'acked'  => [],
    'sched'  => [],
];

foreach ($history as $server => $serverData) {
    foreach ($serverData as $tab => $tabData) {
        foreach ($tabData as $key => $row) {
            $history[$server][$tab][$key]['date'] = returnCorrectedDate($row['date'], $row['server']);
            $row['date'] = returnCorrectedDate($row['date'], $row['server']);
            $all[$tab][] = $row;
        }
    }
}

$history['All'] = $all;

foreach ($history as $server => $serverData) {
    foreach ($serverData as $tab => $tabData) {

        list($state, $service) = returnOrder($tabData);

        array_multisort($state, SORT_DESC, SORT_NATURAL | SORT_FLAG_CASE,
            $service, SORT_ASC, SORT_NATURAL | SORT_FLAG_CASE,
            $tabData
        );

        $history[$server][$tab] = $tabData;
    }
}

echo json_encode($history);
http_response_code(200);
die;

function returnServers($server, $serversList) {
    $servers = [];
    if (!$server || $server == 'All') {
        foreach ($serversList as $key => $value) {
            $servers[] = $key;
        }
    } else {
        $servers[] = $server;
    }

    return $servers;
}
function returnTabsList($serversList) {
    $servers = array_keys($serversList);
    sort($servers);
    $servers = implode(',', $servers);

    return ['serversList' => 'All,'. $servers];
}
function validateDate($date, $format = 'Y-m-d H:i:s'){
    if (isTimestamp($date)) {
        $date = returnDateFromTimestamp($date);
    }

    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}
function isTimestamp($timestamp) {
    if (strlen($timestamp) == 10 && strval(intval($timestamp)) == $timestamp) {
        return true;
    }

    return false;
}
function returnTimestamp($date, $format) {
    $date = DateTime::createFromFormat($format, $date);

    if (intval($date->format('n')) > intval(date('n'))) {
        $date->modify('-1 year');
    }

    $timestamp = strtotime($date->format('Y-m-d H:i:s'));

    return $timestamp;
}
function returnCorrectedDate($date, $server, $format = 'Y-m-d H:i:s') {
    $timeDiff = returnDateDiff($server);

    if ($timeDiff) {
        $timestamp = returnTimestamp($date, $format);
        $timestamp += $timeDiff;
        $date = date($format, $timestamp);

        return $date;
    }

    return $date;
}
function returnDateForDb($timestamp) {
    global $timeCorrectionType, $timeCorrectionDiffTmp;

    if ($timeCorrectionType != 'browser') {
        $timestamp += $timeCorrectionDiffTmp * 60;
    }
    $timestamp -= returnDiffToDb();

    $date = new DateTime("@{$timestamp}");
    $date->setTimezone(new DateTimeZone('UTC'));

    return $date->format('Y-m-d H:i:s');
}
function returnDiffToDb() {
    global $timeCorrectionType;

    if ($timeCorrectionType == 'server') {
        return 0;
    }

    return strtotime(gmdate("Y-m-d H:i:s")) - strtotime(date("Y-m-d H:i:s"));
}
function returnDateDiff($server) {
    global $serversList, $timeZone, $timeCorrectionType, $timeCorrectionDiff;

    if (    !isset($serversList[$server])
        || !isset($serversList[$server]['timeZone'])
        || ($timeCorrectionType == 'server' && $serversList[$server]['timeZone'] == $timeZone)
    ) {
        return 0;
    }

    $diff = strtotime(gmdate("Y-m-d H:i:s")) - strtotime(date("Y-m-d H:i:s"));

    return $timeCorrectionDiff * 60 + $diff;
}
function returnDateFromTimestamp($timestamp) {
    global $timeCorrectionType, $timeCorrectionDiff, $timeZone;

    if ($timeCorrectionType == 'server') {
        $ts = $timestamp + $timeCorrectionDiff * 60;
        $date = new DateTime("@{$ts}");
        $date->setTimezone(new DateTimeZone('UTC'));
    } else if ($timeCorrectionType == 'utc') {
        $ts = $timestamp + $timeCorrectionDiff * 60;
        $date = new DateTime("@{$ts}");
        $date->setTimezone(new DateTimeZone($timeZone));
    } else if ($timeCorrectionType == 'browser') {
        $ts = $timestamp;
        $date = new DateTime("@{$ts}");
        $date->setTimezone(new DateTimeZone($timeZone));
    }

    return $date->format('Y-m-d H:i:s');
}
function returnOrder($data) {
    $state   = [];
    $service = [];

    foreach ($data as $key => $row) {
        $state[$key]   = $row['state_id'];
        $service[$key] = $row['service'];
    }

    return [$state, $service];
}