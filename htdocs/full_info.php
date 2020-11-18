<?php

include_once __DIR__ . '/../scripts/init.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$hostsList = (isset($_GET['hosts_list']) && trim($_GET['hosts_list'])) ? trim($_GET['hosts_list']) : '';
$fullInfo  = new fullInfo;

if ($hostsList) {
    $fullInfo->getFullHostsList();
} else {
    $fullInfo->run();
}

http_response_code(200);
die;
