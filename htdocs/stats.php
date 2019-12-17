<?php

include_once __DIR__ . '/../scripts/init.php';
require_once __DIR__ . '/../scripts/lib/vendor/autoload.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$stats = new stats;
$results = ($stats->list) ? $stats->returnTabsList() : $stats->returnStats();

echo json_encode($results);
http_response_code(200);
die;
