<?php

include_once 'functions.php';

header('Content-Type: application/json');

$array      = json_decode(json_encode(simplexml_load_string(returnDataList(false))),TRUE);
$returnJson = array();

foreach ($array['alert'] as $item) {
	$acked      = (!is_array($item['acked']))                ? $item['acked']                : implode(' ', $item['acked']);
	$ackComment = (!is_array($item['ack_comment']))          ? $item['ack_comment']          : implode(' ', $item['ack_comment']);
	$ackAuthor  = (!is_array($item['ack_author']))           ? $item['ack_author']           : implode(' ', $item['ack_author']);
	$ackComDate = (!is_array($item['ack_comment_date']))     ? $item['ack_comment_date']     : implode(' ', $item['ack_comment_date']);
	$sched      = (!is_array($item['sched']))                ? $item['sched']                : implode(' ', $item['sched']);
	$schComment = (!is_array($item['sched_comment']))        ? $item['sched_comment']        : implode(' ', $item['sched_comment']);
	$schAuthor  = (!is_array($item['sched_author']))         ? $item['sched_author']         : implode(' ', $item['sched_author']);
	$schComDate = (!is_array($item['sched_comment_date']))   ? $item['sched_comment_date']   : implode(' ', $item['sched_comment_date']);
	$host       = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
	$hostUrl    = (!is_array($item['host-url']))             ? $item['host-url']             : implode(' ', $item['host-url']);
	$service    = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
	$serviceUrl = (!is_array($item['service-url']))          ? $item['service-url']          : implode(' ', $item['service-url']);
	$notesUrl   = (!is_array($item['notes_url']))            ? $item['notes_url']            : implode(' ', $item['notes_url']);
	$state      = (!is_array($item['@attributes']['state'])) ? $item['@attributes']['state'] : implode(' ', $item['@attributes']['state']);
	$downtimeId = (!is_array($item['downtime_id']))          ? $item['downtime_id']          : implode(' ', $item['downtime_id']);
	$lastCheck  = (!is_array($item['last_check']))           ? $item['last_check']           : implode(' ', $item['last_check']);
	$lastCheckS = (!is_array($item['last_check_sec']))       ? $item['last_check_sec']       : implode(' ', $item['last_check_sec']);
	$duration   = (!is_array($item['duration']))             ? $item['duration']             : implode(' ', $item['duration']);
	$durationS  = (!is_array($item['durationSec9Digits']))   ? $item['durationSec9Digits']   : implode(' ', $item['durationSec9Digits']);
	$statusInfo = (!is_array($item['status_information']))   ? $item['status_information']   : implode(' ', $item['status_information']);
	
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


