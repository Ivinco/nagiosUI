<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once __DIR__ . '/../scripts/init.php';

$server  = (isset($_REQUEST['server'])  && $_REQUEST['server'])  ? $_REQUEST['server']  : '';
$host    = (isset($_REQUEST['host'])    && $_REQUEST['host'])    ? $_REQUEST['host']    : '';
$service = (isset($_REQUEST['service']) && $_REQUEST['service']) ? $_REQUEST['service'] : '';

if ((!$host && !$service) || !$server) {
	http_response_code(404);
	die;
}

global $db;

echo json_encode($db->returnComments($host, $service, $server));

http_response_code(200);
die;
