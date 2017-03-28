<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once 'functions.php';

global $plannedUrl;

$file  = $plannedUrl;
$return = null;

if (!empty($_POST)) {
	$text = str_replace("\"", "&quot;", trim($_POST['text']));
	$time = intval($_POST['time']);
	$line = $_POST['line'];
	$user = $_POST['user'];
	
	if (!$text || $time < 1) {
		http_response_code(400);
		die;
	}
	
	if ($line == 'new') {
		addData($file, $line, $text, $time, $user);
	} else if (intval($line) > 0) {
		removeData($file, $line);
	}	
}

echo json_encode(recheckData($file), true);
http_response_code(200);

function addData($file, $line = false, $text = false, $time = false, $user) {
	$json = returnPlanned();
	
	if ($line == 'new') {
		$end = (time() + $time * 60);
		
		$json[] = [
			'command' => $text,
			'time'    => $time,
			'end'     => $end,
			'date'    => date('Y-m-d H:i:s', $end),
			'user'    => $user,
		];
	}
	
	writePlanned($json);
}

function removeData($file, $line) {
	$json = returnPlanned();
	
	$results = [];
	$delete  = null;
	
	foreach ($json as $key => $record) {
		if ($record['end'] > time() && $key != ($line - 1)) {
			$results[] = $record;
		}
		
		if ($record['end'] > time() && $key == ($line - 1)) {
			$delete = $record['command'];
		}
	}
	
	removePlannedMaintenance($delete);
	writePlanned($results);
}

function recheckData($file) {
	$json = returnPlanned();
	
	$results = [];
	
	foreach ($json as $record) {
		if ($record['end'] > time()) {
			$results[] = $record;
		}
	}
	
	writePlanned($results);
	
	global $plannedTemplates;
	
	return ['file' => $results, 'templates' => $plannedTemplates];
}