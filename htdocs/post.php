<?php

include_once 'config/nagios2Config.php';

$return     = array();
$type       = $_POST['type'];

if (!in_array($type, array('recheckIt', 'quickAck', 'quickUnAck', 'unAck', 'acknowledgeIt', 'scheduleIt', 'downtime')) || !file_exists($nagiosPipe)) {
	http_response_code(400);
}

foreach ($_POST['data'] as $post) {
	$f = fopen($nagiosPipe, 'w');

	if ($type == 'quickAck' || $type == 'acknowledgeIt') {
		fwrite($f, "[".time()."] ACKNOWLEDGE_SVC_PROBLEM;{$post['host']};{$post['service']};1;1;0;{$post['author']};{$post['com_data']}\n");
	}
	else if ($type == 'quickUnAck' || $type == 'unAck') {
		fwrite($f, "[".time()."] REMOVE_SVC_ACKNOWLEDGEMENT;{$post['host']};{$post['service']}\n");
	}
	else if ($type == 'scheduleIt') {
		$dateTime = explode(' ', $post['start_time']);
		$date     = explode('-', $dateTime[0]);
		$start    = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);
		
		$dateTime = explode(' ', $post['end_time']);
		$date     = explode('-', $dateTime[0]);
		$end      = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);
		
		fwrite($f, "[".time()."] SCHEDULE_SVC_DOWNTIME;{$post['host']};{$post['service']};{$start};{$end};1;0;{$post['hours']};{$post['author']};{$post['com_data']}\n");
	}
	else if ($type == 'downtime') {
		fwrite($f, "[".time()."] DEL_SVC_DOWNTIME;{$post['down_id']}\n");
	}
	else if ($type == 'recheckIt') {
		$dateTime = explode(' ', $post['start_time']);
		$date     = explode('-', $dateTime[0]);
		$start    = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);
		
		fwrite($f, "[".time()."] SCHEDULE_FORCED_SVC_CHECK;{$post['host']};{$post['service']};{$start}\n");
	}
	
	fclose($f);
}

return http_response_code(200);