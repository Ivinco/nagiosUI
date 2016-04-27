<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$file   = 'planned.json';
$return = null;

if (!empty($_POST)) {
	$text = str_replace("\"", "&quot;", trim($_POST['text']));
	$time = intval($_POST['time']);
	$line = $_POST['line'];
	
	if (!$text || $time < 1) {
		http_response_code(400);
		die;
	}
	
	if ($line == 'new') {
		addData($file, $line, $text, $time);
	} else if (intval($line) > -1) {
		addData($file, $line, $text);
	}	
}

echo json_encode(recheckData($file), true);
http_response_code(200);

function addData($file, $line = false, $text = false, $time = false) {
	$json = json_decode(file_get_contents($file), true);
	
	if ($line == 'new') {
		$end = (time() + $time * 60);
		
		$json[] = [
			'command' => $text,
			'time'    => $time,
			'end'     => $end,
			'date'    => date('Y-m-d H:i:s', $end),
		];
	} else if (intval($line) > 0) {
		$json[($line - 1)]['command'] = $text;
	}
	
	file_put_contents($file, json_encode($json, true));
	
	return;
}

function recheckData($file) {
	$json = json_decode(file_get_contents($file), true);
	
	$results = [];
	
	foreach ($json as $record) {
		if ($record['end'] > time()) {
			$results[] = $record;
		}
	}
	
	file_put_contents($file, json_encode($results, true));
	
	return $results;
}