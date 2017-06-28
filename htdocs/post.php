<?php

include_once 'config/config.php';

$return = array();

if (!isset($_REQUEST['type']) || !$_REQUEST['type']) {
	echo 'type is empty';
	http_response_code(404);
	
	die;
}

$type = $_REQUEST['type'];

if (!in_array($type, array('recheckIt', 'quickAck', 'quickUnAck', 'unAck', 'unAcknowledgeIt', 'acknowledgeIt', 'scheduleIt', 'downtime', 'scheduleItTime')) || !file_exists($nagiosPipe)) {
	echo 'type not in array OR file ('. $nagiosPipe .') not exists, please check in config.php $nagiosPipe value';
	http_response_code(404);
	
	die;
}

foreach ($_REQUEST['data'] as $post) {
	$f = fopen($nagiosPipe, 'w');
		
	if (!$f) {
		echo "check file permissions";
		http_response_code(400);
		
		die;
	}
	
	if ($type == 'quickAck' || $type == 'acknowledgeIt') {
		if ($post['isHost'] == 'service') {
			fwrite($f, "[".time()."] ACKNOWLEDGE_SVC_PROBLEM;{$post['host']};{$post['service']};2;1;0;{$post['author']};{$post['com_data']}\n");
		}
		
		if ($post['isHost'] == 'host') {
			fwrite($f, "[".time()."] ACKNOWLEDGE_HOST_PROBLEM;{$post['host']};2;1;0;{$post['author']};{$post['com_data']}\n");
		}
	}
	else if ($type == 'quickUnAck' || $type == 'unAck' || $type == 'unAcknowledgeIt') {
		if ($post['isHost'] == 'service') {
			fwrite($f, "[".time()."] REMOVE_SVC_ACKNOWLEDGEMENT;{$post['host']};{$post['service']}\n");
		}
		
		if ($post['isHost'] == 'host') {
			fwrite($f, "[".time()."] REMOVE_HOST_ACKNOWLEDGEMENT;{$post['host']}\n");
		}
	}
	else if ($type == 'scheduleIt' || $type == 'scheduleItTime') {
		if ($type == 'scheduleItTime') {
			$start    = $post['start_time'];
			$end      = $post['end_time'];
			$duration = round(intval($post['hours']) / 3600);
		} else {
			$dateTime = explode(' ', $post['start_time']);
			$date     = explode('-', $dateTime[0]);
			$start    = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);
			
			$dateTime = explode(' ', $post['end_time']);
			$date     = explode('-', $dateTime[0]);
			$end      = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);
			
			$duration = $post['hours'];
		}
		
		
		if ($post['isHost'] == 'service') {
			fwrite($f, "[".time()."] SCHEDULE_SVC_DOWNTIME;{$post['host']};{$post['service']};{$start};{$end};1;0;{$duration};{$post['author']};{$post['com_data']}\n");
		}
		
		if ($post['isHost'] == 'host') {
			fwrite($f, "[".time()."] SCHEDULE_HOST_DOWNTIME;{$post['host']};{$start};{$end};1;0;{$post['hours']};{$duration};{$post['com_data']}\n");
		}
	}
	else if ($type == 'downtime') {
		if ($post['isHost'] == 'service') {
			fwrite($f, "[".time()."] DEL_SVC_DOWNTIME;{$post['down_id']}\n");
		}
		
		if ($post['isHost'] == 'host') {
			fwrite($f, "[".time()."] DEL_HOST_DOWNTIME;{$post['down_id']}\n");
		}
	}
	else if ($type == 'recheckIt') {
	    if (!isset($post['start_time']) || !$post['start_time']) {
            $post['start_time'] = date('m-d-Y H:i:s');
        }
		$dateTime = explode(' ', $post['start_time']);
		$date     = explode('-', $dateTime[0]);
		$start    = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);
		
		if ($post['isHost'] == 'service') {
			fwrite($f, "[".time()."] SCHEDULE_FORCED_SVC_CHECK;{$post['host']};{$post['service']};{$start}\n");
		}
		
		if ($post['isHost'] == 'host') {
			fwrite($f, "[".time()."] SCHEDULE_FORCED_HOST_CHECK;{$post['host']};{$start}\n");
		}
	}
	
	fclose($f);
}

echo "finished";
http_response_code(200);
