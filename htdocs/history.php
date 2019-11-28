<?php

include_once __DIR__ . '/../scripts/init.php';

$server   = (isset($_GET['server'])    && $_GET['server'])    ? $_GET['server']    : '';
$date     = (isset($_GET['date'])      && $_GET['date'])      ? $_GET['date']      : '';
$dateFrom = (isset($_GET['date_from']) && $_GET['date_from']) ? $_GET['date_from'] : '';
$dateTo   = (isset($_GET['date_to'])   && $_GET['date_to'])   ? $_GET['date_to']   : '';
$list     = (isset($_GET['list'])      && $_GET['list'])      ? $_GET['list']      : '';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

if ($list) {
    echo json_encode(returnTabsList($serversList));
    http_response_code(200);
    die;
}

if ($date && !validateDate($date)) {
    http_response_code(400);
    die('date_from format must be: "1970-01-01 00:00:00" or timestamp');
}
if ($dateFrom && !validateDate($dateFrom)) {
    http_response_code(400);
    die('date_from format must be: "1970-01-01 00:00:00" or timestamp');
}
if ($dateTo && !validateDate($dateTo)) {
    http_response_code(400);
    die('date_to format must be: "1970-01-01 00:00:00" or timestamp');
}
if (!$dateFrom && !$dateTo && !$date) {
    http_response_code(400);
    die('date or date_from or date_to must be set. Date format: "1970-01-01 00:00:00" or timestamp');
}

if (!$dateTo && $date) {
    $dateTo = $date;
}

$db       = new db;
$history  = [];
$servers  = returnServers($server, $serversList);
$dateFrom = (isTimestamp($dateFrom)) ? returnDateFromTimestamp($dateFrom) : $dateFrom;
$dateTo   = (isTimestamp($dateTo))   ? returnDateFromTimestamp($dateTo)   : $dateTo;

if (!$dateFrom && $dateTo) {
    foreach ($servers as $item) {
        $history[$item] = $db->historyGetUnfinishedAlertsWithDate($item, $dateTo);
    }

    $all = [
        'normal' => [],
        'acked'  => [],
        'sched'  => [],
    ];

    foreach ($history as $server => $serverData) {
        foreach ($serverData as $tab => $tabData) {
            foreach ($tabData as $row) {
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
} else {
    foreach ($servers as $item) {
        $history[$item] = $db->historyGetUnfinishedAlertsWithPeriod($item, $dateFrom, $dateTo);
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
function returnDateFromTimestamp($timestamp) {
    $date = new DateTime("@{$timestamp}");

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