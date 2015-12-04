<?php

include_once 'functions.php';

header('Content-Type: application/json');

$array      = json_decode(json_encode(simplexml_load_string(returnDataList(false))),TRUE);
$returnJson = array();

foreach ($array['alert'] as $item) {
	$acked      = (!empty($item['acked']))                ? $item['acked']                : '';
	$ackComment = (!empty($item['ack_comment']))          ? $item['ack_comment']          : '';
	$ackAuthor  = (!empty($item['ack_author']))           ? $item['ack_author']           : '';
	$ackComDate = (!empty($item['ack_comment_date']))     ? $item['ack_comment_date']     : '';
	$sched      = (!empty($item['sched']))                ? $item['sched']                : '';
	$schComment = (!empty($item['sched_comment']))        ? $item['sched_comment']        : '';
	$schAuthor  = (!empty($item['sched_author']))         ? $item['sched_author']         : '';
	$schComDate = (!empty($item['sched_comment_date']))   ? $item['sched_comment_date']   : '';
	$host       = (!empty($item['host']))                 ? $item['host']                 : '';
	$hostUrl    = (!empty($item['host-url']))             ? $item['host-url']             : '';
	$service    = (!empty($item['service']))              ? $item['service']              : '';
	$serviceUrl = (!empty($item['service-url']))          ? $item['service-url']          : '';
	$notesUrl   = (!empty($item['notes_url']))            ? $item['notes_url']            : '';
	$state      = (!empty($item['@attributes']['state'])) ? $item['@attributes']['state'] : '';
	$downtimeId = (!empty($item['downtime_id']))          ? $item['downtime_id']          : '';
	$lastCheck  = (!empty($item['last_check']))           ? $item['last_check']           : '';
	$lastCheckS = (!empty($item['last_check_sec']))       ? $item['last_check_sec']       : '';
	$duration   = (!empty($item['duration']))             ? $item['duration']             : '';
	$durationS  = (!empty($item['durationSec9Digits']))   ? $item['durationSec9Digits']   : '';
	$statusInfo = (!empty($item['status_information']))   ? $item['status_information']   : '';
	$returnType = '';
	$returnType.= (($acked == 0 && $sched == 0) || ($acked == 1 && $ackComment == 'temp')) ? '__normal__' : '';
	$returnType.= ($acked == 1 && $ackComment != 'temp') ? '__acked__' : '';
	$returnType.= ($sched == 1) ? '__sched__' : '';
	$returnAck  = "";
	$returnAck .= ($ackComment != '')      ? "'{$ackComment}' by {$ackAuthor}" : "";
	$returnAck .= ($ackComDate != '') ? "<br />added: {$ackComDate}" : "";
	$returnSche = "";
	$returnSche.= ($schComment != '')       ? "'{$schComment}' by {$schAuthor}" : "";
	$returnSche.= ($schComDate != '') ? "<br />added: {$schComDate}" : "";
				
	$returnJson[] = array(
		'host'      => array(
			'name'  => $host,
			'url'   => $hostUrl,
		),
		'service'   => array(
			'name'  => $service,
			'url'   => $serviceUrl,
			'unAck' => ($acked == 1 && $ackComment != 'temp') ? true : false,
			'down'  => ($sched == 1) ? true : false,
			'notes' => $notesUrl,
			'qAck'  => ($ackComment != 'temp') ? true : false,
			'qUAck' => ($ackComment == 'temp') ? $ackAuthor : false,
		),
		'status'    => array(
			'name'  => $state,
			'order' => ($state == 'CRITICAL') ? 4 : (($state == 'UNKNOWN') ? 3 : (($state == 'WARNING') ? 2 : (($state == 'OK') ? 1 : 0))),
			'down'  => $downtimeId,
		),
		'last'      => array(
			'name'  => $lastCheck, 
			'order' => $lastCheckS,
		),
		'duration'  => array(
			'name'  => $duration,
			'order' => $durationS,
		),
		'comment'   => array(
			'ack'   => $returnAck,
			'sched' => $returnSche,
		),
		'type'      => $returnType,
		'state'     => $state,
		'info'      => $statusInfo,
	);
}

$additional = array(
	'userName'          => $array['user'],
	'nagiosConfigFile'  => $array['nagios-config-file'],
	'nagiosPostFile'    => $array['nagios-post-file'],
	'nagiosFullListUrl' => $array['nagios-full-list-url'],
	'updateHash'        => $array['hash'],
);

echo json_encode(array('data' => $returnJson, 'additional' => $additional));


