<?php

include_once __DIR__ . '/../scripts/init.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$memcacheEnabled = false;
$_GET['filter'] = 'normal';
$result = [
    'All' => 0
];

foreach ($serversList as $server => $data) {
    $_GET['server_tab'] = $server;

    $json = new json;
    $count = (int) $json->additional['normal'];

    $result['All'] += $count;
    $result[$server] = $count;
}

echo json_encode($result);

http_response_code(200);
die;

