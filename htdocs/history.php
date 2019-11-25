<?php

include_once __DIR__ . '/../scripts/init.php';

$server   = (isset($_GET['server'])    && $_GET['server'])    ? $_GET['server']    : '';
$dateFrom = (isset($_GET['date_from']) && $_GET['date_from']) ? $_GET['date_from'] : '';
$dateTo   = (isset($_GET['date_to'])   && $_GET['date_to'])   ? $_GET['date_to']   : '';

if ($dateFrom && !validateDate($dateFrom)) {
    http_response_code(400);
    die('date_from format must be: "1970-01-01 00:00:00"');
}
if ($dateTo && !validateDate($dateTo)) {
    http_response_code(400);
    die('date_to format must be: "1970-01-01 00:00:00"');
}
if (!$dateFrom && !$dateTo) {
    http_response_code(400);
    die('date_from or date_to must be set. Date format: "1970-01-01 00:00:00"');
}


$servers = [];
if (!$server || $server == 'All') {
    foreach ($serversList as $key => $value) {
        $servers[] = $key;
    }
} else {
    $servers[] = $server;
}


$db = new db;
$history = [];

foreach ($servers as $item) {
    if (!$dateFrom && $dateTo) {
        $history[$item] = $db->historyGetUnfinishedAlertsWithDate($item, $dateTo);
    } else {
        $history[$item] = $db->historyGetUnfinishedAlertsWithPeriod($item, $dateFrom, $dateTo);
    }
}

ob_start('ob_gzhandler');
header('Content-Type: application/json');

echo json_encode($history);
http_response_code(200);
die;


function validateDate($date, $format = 'Y-m-d H:i:s'){
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}