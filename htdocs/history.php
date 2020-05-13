<?php

include_once __DIR__ . '/../scripts/init.php';

$utils = new utils();

$server   = (isset($_GET['server'])    && $_GET['server'])    ? $_GET['server']    : '';
$date     = (isset($_GET['date'])      && $_GET['date'])      ? $_GET['date']      : '';
$list     = (isset($_GET['list'])      && $_GET['list'])      ? $_GET['list']      : '';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

if ($list) {
    $return = [
        'serversList'    => $utils->getServerTabsList(),
        'timeZonesList'  => $utils->getTimeZonesList(),
        'groupByService' => 2,
        'groupByHost'    => 11
    ];

    echo json_encode($return);
    http_response_code(200);
    die;
}

if (!$date || !isTimestamp($date)) {
    http_response_code(400);
    die('date must be set. Date format: timestamp');
}

$db       = new db;
$history  = [];
$servers  = returnServers($server, $serversList);

foreach ($servers as $item) {
    $history[$item] = $db->historyGetUnfinishedAlertsWithDate($item, getDateForDB($date));
}

$all = [
    'normal'    => [],
    'acked'     => [],
    'sched'     => [],
    'EMERGENCY' => [],
];

foreach ($history as $server => $serverData) {
    foreach ($serverData as $tab => $tabData) {
        foreach ($tabData as $key => $row) {
            $history[$server][$tab][$key]['date'] = $row['date'] = returnCorrectedDate($row['date']);
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

function getDateForDB($ts) {
    global $utils;

    if ($utils->timeCorrectionType == $utils::BROWSER_TYPE_NAME) {
        $ts -= $utils->timeCorrectionDiff * 60;
    }

    $ts -= getDiffToDB();
    $ts += getDiffToUTC();
    $date = new DateTime("@{$ts}");

    return $date->format('Y-m-d H:i:s');
}
function getDiffToDB() {
    return strtotime(gmdate("Y-m-d H:i:s")) - strtotime(date("Y-m-d H:i:s"));
}
function getDiffToUTC() {
    global $utils;

    date_default_timezone_set($utils->validateTimeZone($utils->timeCorrectionType));
    $diff = strtotime(gmdate("Y-m-d H:i:s")) - strtotime(date("Y-m-d H:i:s"));
    date_default_timezone_set($utils->default_time_zone);

    return $diff;
}

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

function getDateDiff() {
    global $utils;

    return $utils->timeCorrectionDiff * 60 + getDiffToDB() - getDiffToUTC();
}
function returnCorrectedDate($requestDate, $format = 'Y-m-d H:i:s') {
    global $utils;

    $date = DateTime::createFromFormat($format, $requestDate, new DateTimeZone($utils->default_time_zone));
    $date->modify(getDateDiff() . ' seconds');
    $date->setTimeZone(new DateTimeZone($utils->getTimeZone($utils->timeCorrectionType)));

    return $date->format($format);
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