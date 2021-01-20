<?php

include_once __DIR__ . '/../scripts/init.php';
require_once __DIR__ . '/../scripts/lib/vendor/autoload.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$lastYear = (isset($_GET['lastyear']) && $_GET['lastyear']) ? true : false;
$saveHandled = (isset($_GET['save_handled']));

if ($lastYear) {
    $results = [];

    for ($i = 12; $i >= 1; $i--) {
        $date  = date("Y m", strtotime( gmdate( 'Y-m-d H:i:s' )." -$i months first day of this month"));
        $start = strtotime( date( 'Y-m-d 00:00:00' )." -$i months first day of this month");
        $end   = strtotime( date( 'Y-m-d 23:59:59' )." -$i months last day of this month");

        $_GET['from'] = $start;
        $_GET['to']   = $end;

        $stats = new stats(true);
        $results[$date] = $stats->returnLastYearStats();
    }
} else if ($saveHandled) {
    $stats = new stats(true);

    $results = $stats->saveHandled();
} else {
    $stats = new stats;
    $results = ($stats->list) ? $stats->returnTabsList() : $stats->returnStats();
}

echo json_encode($results);
http_response_code(200);
die;
