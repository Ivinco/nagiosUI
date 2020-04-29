<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once __DIR__ . '/../scripts/init.php';

$recheck = new recheck;

if (isset($_GET['run']) && $_GET['run']) {
    $recheck->setRecheckStatus();
} else {
    $recheck->getRecheckStatus();
}

http_response_code(200);
die;
