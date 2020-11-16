<?php

include_once __DIR__ . '/../scripts/init.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$fullInfo = new fullInfo;
$fullInfo->run();

http_response_code(200);
die;
