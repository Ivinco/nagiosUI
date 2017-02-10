<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once 'config/config.php';

$host    = $_REQUEST['host'];
$service = $_REQUEST['service'];
$return  = [];

if ((!$host && !$service) || !$commentsSelect) {
	http_response_code(404);
	die;
}

if ($host && $service) {
	$commentsSelectHostService = str_replace('<host>', $host, $commentsSelectHostService);
	$commentsSelectHostService = str_replace('<service>', $service, $commentsSelectHostService);
	exec($commentsSelectHostService, $output);
} else if ($host) {
	$commentsSelectHost = str_replace('<host>', $host, $commentsSelectHost);
	exec($commentsSelectHost, $output);
} else {
	$commentsSelectService = str_replace('<service>', $service, $commentsSelectService);
	exec($commentsSelectService, $output);
}

foreach ($output as $record) {
	$item = explode("\t", $record);
	
	if ($item[0]) {
		$return[] = [
			'name' => trim($item[0]),
			'date' => trim($item[1]),
		];
	}
}

echo json_encode($return);

http_response_code(200);
die;
