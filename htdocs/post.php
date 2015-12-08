<?php

$return     = array();
$type       = $_POST['type'];
$nagiosPipe = '/var/log/nagios/rw/nagios.cmd';

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
		fwrite($f, "[".time()."] SCHEDULE_SVC_DOWNTIME;{$post['host']};{$post['service']};{$post['start_time']};{$post['end_time']};1;0;{$post['hours']};{$post['author']};{$post['com_data']}\n");
	}
	else if ($type == 'downtime') {
		fwrite($f, "[".time()."] DEL_SVC_DOWNTIME;{$post['down_id']}\n");
	}
	else if ($type == 'recheckIt') {
		fwrite($f, "[".time()."] SCHEDULE_FORCED_SVC_CHECK;{$post['host']};{$post['service']};{$post['start_time']}\n");
	}
	
	fclose($f);
}

sleep(2);

return http_response_code(200);
