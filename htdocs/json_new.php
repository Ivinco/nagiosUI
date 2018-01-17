<?php

include_once __DIR__ . '/../scripts/init.php';

if (!isset($_SESSION)) {
    session_start();
}

ignore_user_abort(false);
set_time_limit(10);

if (connection_aborted()) {
    http_response_code(404);
    die;
}

if (isset($_GET['returndate'])) {
    echo "Last Updated: " . date('D M j H:i:s T Y');
    http_response_code(200);
    die;
}

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$json = new json;


echo json_encode(array('data' => $json->returnJson, 'additional' => $json->additional));

http_response_code(200);
die;
