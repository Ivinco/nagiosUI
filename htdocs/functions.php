<?php

include_once 'config/config.php';

function returnDataList($isHash, $xmlFile) {
	
	global $statusFile_global;
	global $getNotesUrls_cacheFile;
	global $getDepends_cacheFile;
	global $alertsPercentile_global;
	global $durationsFromFile_global;
	global $nagiosConfigFile;
	global $nagiosFullHostUrl;
	global $xmlArchive;
	global $usersArray;
	global $nagiosCommentUrl;
	global $groupByService;
	global $groupByHost;
	global $refreshArray;

$xmlContent = '<alerts sort="1">
';

	$verificateCheck   = '';
	$pregHostStatus    = '/hoststatus {'.
							'[^{}]*?host_name=(?P<host>[^{}]*?)\n'.
							'[^{}]*?current_state=([^0])\n'.
							'[^{}]*?plugin_output=(?P<plugin_output>[^{}]*?)\n'.
							'[^{}]*?last_check=(?P<last_check>[^{}]*?)\n'.
							'[^{}]*?current_attempt=(?P<attempts>[^{}]*?)\n'.
							'[^{}]*?max_attempts=(?P<max_attempts>[^{}]*?)\n'.
							'[^{}]*?last_state_change=(?P<last_status_change>[^{}]*?)\n'.
						 '[^{}]*?}/is';
	$pregServiceStatus = '/servicestatus {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?current_state=(?P<state>.*?)\n'.
							'.*?current_attempt=(?P<attempts>.*?)\n'.
							'.*?max_attempts=(?P<max_attempts>.*?)\n'.
							'.*?last_state_change=(?P<last_status_change>.*?)\n'.
							'.*?plugin_output=(?P<plugin_output>.*?)\n'.
							'.*?last_check=(?P<last_check>.*?)\n'.
							'.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
							'.*?scheduled_downtime_depth=(?P<scheduled>.*?)\n'.
						 '.*?}/is';
	$pregServiceComment = '/(servicedowntime|servicecomment) {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?(downtime_id|entry_type)=(?P<entry_type>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?(comment|comment_data)=(?P<comment>.*?)\n'.
						  '.*?}/is';
						  
						  
	
	if ($xmlFile) {
		$files = glob($xmlArchive.$_GET['file']."*.log");
		
		if (count($files) == 1 and preg_match('/'.preg_quote($xmlArchive, '/').'\d\d\d\d\d\d\d\d_\d\d\d\d\d\d\.log/', $files[0])) {
			return file_get_contents($files[0]);

		}
	}
	
	$statusFile = file_get_contents($statusFile_global);
	
	preg_match_all($pregHostStatus, $statusFile, $downHostsMatches);
	
	if (!preg_match_all($pregServiceStatus, $statusFile, $matches)) {
		die("ERROR: no services found\n");
	}
	
	if (preg_match_all($pregServiceComment, $statusFile, $ackAndSchedMatches)) {
		$tmp = array();
	
		foreach ($ackAndSchedMatches['host'] as $k=>$host) {
			$commentType = ($ackAndSchedMatches['entry_type'][$k] == 2) ? 'other' : (($ackAndSchedMatches['entry_type'][$k] == 4 || $ackAndSchedMatches['entry_type'][$k] == 1) ? 'ack' : 'sched');
			
			$tmp[$host][$ackAndSchedMatches['service'][$k]][] = array(
				'ackAuthor'        => ($commentType == 'ack')   ? $ackAndSchedMatches['author'][$k]     : '',
				'ackComment'       => ($commentType == 'ack')   ? $ackAndSchedMatches['comment'][$k]    : '',
				'ackCommentDate'   => ($commentType == 'ack')   ? $ackAndSchedMatches['entry_time'][$k] : '',
				'schedAuthor'      => ($commentType == 'sched') ? $ackAndSchedMatches['author'][$k]     : '',
				'schedComment'     => ($commentType == 'sched') ? $ackAndSchedMatches['comment'][$k]    : '',
				'schedCommentDate' => ($commentType == 'sched') ? $ackAndSchedMatches['entry_time'][$k] : '',
				'downtime_id'      => ($commentType != 'other') ? $ackAndSchedMatches['entry_type'][$k] : '',
			);
		}
	
		$ackAndSchedMatches = $tmp;
		unset($tmp);
	}
	
	$alertsPercentile  = @unserialize(file_get_contents($alertsPercentile_global));
	$durationsFromFile = @unserialize(file_get_contents($durationsFromFile_global));
	$notesUrls         = getNotesUrls();
	$depends           = getDepends();
	
	$hosts = array();
	foreach ($matches['host'] as $k=>$host) {
		$hosts[$host][$matches['service'][$k]] = array(
			'acked'              => $matches['acked'][$k],
			'scheduled'          => $matches['scheduled'][$k],
			'state'              => $matches['state'][$k],
			'last_status_change' => $matches['last_status_change'][$k],
			'plugin_output'      => $matches['plugin_output'][$k],
			'attempts'           => $matches['attempts'][$k],
			'max_attempts'       => $matches['max_attempts'][$k],
			'last_check'         => $matches['last_check'][$k]
		);
	}
	unset($matches);
	
	foreach ($downHostsMatches['host'] as $k=>$host) { // copying down host alerts to normal service alerts
	//TODO: hide links to ack/sched/check for a host
		unset($hosts[$host]);
		
		$hosts[$host]['SERVER IS UP'] = array(
			'acked'              => 0, // we do not care if down host is ack'ed or not
			'scheduled'          => 0, // we do not care if down host is scheduled for downtime or not
			'state'              => 2, // down host is always shown as CRITICAL alert
			'last_status_change' => $downHostsMatches['last_status_change'][$k],
			'plugin_output'      => $downHostsMatches['plugin_output'][$k],
			'attempts'           => $downHostsMatches['attempts'][$k],
			'max_attempts'       => $downHostsMatches['max_attempts'][$k],
			'last_check'         => $downHostsMatches['last_check'][$k]
		);
	}
	
	foreach ($hosts as $host=>$services) {
		foreach ($services as $service=>$attrs) {
			if (isset($depends[$service])) { // dependency found, let's check if we should hide the alert
				if ($pos = strpos($depends[$service], '$') && $pos !== false) {
					$parentService = @$hosts[substr($depends[$service], 0, $pos)][substr($depends[$service], $pos + 1)];
				}
				else {
					$parentService = @$hosts[$host][$depends[$service]];
				}
				
				if (isset($parentService['state']) && $parentService['state'] == 0) {
					continue;
				}
			}
			
			$criticalPercentileDuration = isset($alertsPercentile[$host.'_'.$service]) ? $alertsPercentile[$host.'_'.$service] : 0;
			
			
			if ($attrs['state'] > 0 || (!$attrs['state'] && isset($attrs['scheduled']) && $attrs['scheduled']) || ($criticalPercentileDuration && $criticalPercentileDuration > 4*3600)) {
				$statesAr       = array(0 => 'OK', 1 => 'WARNING', 2 => 'CRITICAL', 3 => 'UNKNOWN');
				$state          = $statesAr[$attrs['state']];
				$origState      = '';
				$serviceEncoded = urlencode($service);
				$pluginOutput   = nl2br(htmlentities(str_replace(array('<br>', '<br/>'), array("\n", "\n"), $attrs['plugin_output']), ENT_XML1));
				$notesUrl       = (isset($notesUrls[$service])) ? $notesUrls[$service] : '';
				
				if (preg_match("/zabbix_redirect/", $notesUrl)) {
					$notesUrl = strstr($notesUrl, 'host=', true) . "host={$host}&" . strstr($notesUrl, 'item=', false);
				}
				
				if ($criticalPercentileDuration && $criticalPercentileDuration > 60*4 && (!isset($attrs['acked']) || !$attrs['acked']) && (!isset($attrs['scheduled']) || !$attrs['scheduled'])) {
					$durationSec = $criticalPercentileDuration * 60;
					$duration    = duration($durationSec, false)." (50%)";
					$origState   = $state;
					$state       = 'CRITICAL';
				}
				else {
					$durationSec = (isset($durationsFromFile[$host.'_'.$service])) ? $durationsFromFile[$host.'_'.$service] * 60 : time() - $attrs['last_status_change'];
					$duration    = duration($durationSec, false);
				}
				
				$ackedStatus   = (int)$attrs['acked'];
				$ackComment    = '';
				$schedComment  = '';
				$downtime_id   = '';
				$ackLastTemp   = '';
				$ackLastAuthor = '';
				
				if (isset($ackAndSchedMatches[$host][$service])) {
					$tmpAckComments   = array();
					$tmpSchedComments = array();
					$tmpDowntimeId    = array();
					$tmpAckAuthor     = array();
					$tmpAckTemp       = array();
					
					foreach ($ackAndSchedMatches[$host][$service] as $tmpComments) {
						if ($tmpComments['ackComment']) {
							$tmpValue  = ($tmpComments['ackComment'] == 'temp') ? 'temp' : preg_replace('/(#(\d+))/', $nagiosCommentUrl, $tmpComments['ackComment']);
							$tmpValue  = preg_replace('/(#(\d+))/', $nagiosCommentUrl, $tmpComments['ackComment']);
							$tmpValue  = "'{$tmpValue}' by {$tmpComments['ackAuthor']}";
							$tmpValue .= ($tmpComments['ackCommentDate']) ? '<br />added: '. date('M j H:i', intval($tmpComments['ackCommentDate'])) : '';
							
							$tmpAckComments[] = $tmpValue;
							$tmpAckAuthor[]   = $tmpComments['ackAuthor'];
							$tmpAckTemp[]     = $tmpComments['ackComment'];
						}
						if ($tmpComments['schedComment']) {
							$tmpValue  = preg_replace('/(#(\d+))/', $nagiosCommentUrl, $tmpComments['schedComment']);
							$tmpValue  = "'{$tmpValue}' by {$tmpComments['schedAuthor']}";
							$tmpValue .= ($tmpComments['schedCommentDate']) ? '<br />added: '. date('M j H:i', intval($tmpComments['schedCommentDate'])) : '';
							
							$tmpSchedComments[] = $tmpValue;
						}
						if ($tmpComments['downtime_id'] && $state == 'OK') {
							$tmpDowntimeId[] = $tmpComments['downtime_id'];
						}
					}
					
					$ackComment    = implode('<br /><br />', $tmpAckComments);
					$schedComment  = implode('<br /><br />', $tmpSchedComments);
					$downtime_id   = (!empty($tmpDowntimeId)) ? end($tmpDowntimeId) : '';
					$ackLastTemp   = (!empty($tmpAckTemp))    ? end($tmpAckTemp) : '';
					$ackLastAuthor = (!empty($tmpAckAuthor))  ? end($tmpAckAuthor) : '';
				}
				
				$scheduled  = (int)$attrs['scheduled'];
				$last_check = date('m-d-Y H:i:s', $attrs['last_check']);
				$attempt    = $attrs['attempts']/$attrs['max_attempts'];
				
				$userAvatar = (isset($usersArray[$ackLastAuthor])) ? $usersArray[$ackLastAuthor] : '';

$xmlContent .= '	<alert state="'. $state .'" origState="'. $origState .'">
		<host>'.               $host .'</host>
		<host-url>'.           hostUrl($host) .'</host-url>
		<service>'.            parseToXML(htmlentities($service, ENT_XML1)) .'</service>
		<service-url>'.        serviceUrl($host, htmlentities($serviceEncoded, ENT_XML1)) .'</service-url>
		<notes_url>'.          htmlentities($notesUrl, ENT_XML1) .'</notes_url>
		<status>'.             $state .'</status>
		<acked>'.              $ackedStatus .'</acked>
		<sched>'.              $scheduled .'</sched>
		<downtime_id>'.        $downtime_id .'</downtime_id>
		<ack_last_temp>'.      $ackLastTemp .'</ack_last_temp>
		<ack_last_author>'.    $ackLastAuthor .'</ack_last_author>
		<quick_ack_author>'.   md5(strtolower(trim($userAvatar))) .'</quick_ack_author>
		<sched_comment>'.      parseToXML(htmlspecialchars($schedComment)) .'</sched_comment>
		<ack_comment>'.        parseToXML(htmlspecialchars($ackComment)) .'</ack_comment>
		<last_check>'.         $last_check .'</last_check>
		<last_check_sec>'.     $attrs['last_check'] .'</last_check_sec>
		<durationSec>'.        $durationSec .'</durationSec>
		<durationSec9Digits>'. sprintf('%09d', $durationSec) .'</durationSec9Digits>
		<duration>'.           $duration .'</duration>
		<attempt>'.            $attempt .'</attempt>
		<status_information>'. parseToXML($pluginOutput) .'</status_information>
	</alert>
';
		
			$verificateCheck .= $state . $origState . $host . $service . $serviceEncoded . $ackLastTemp . $attempt;
			$verificateCheck .= $notesUrl . $ackedStatus . $scheduled . $downtime_id . $ackLastAuthor . $pluginOutput;
			$verificateCheck .= $schedComment . $ackComment . $last_check;

		}
	}
}
$refreshArrayData = [];
foreach ($refreshArray as $item) {
	$refreshArrayData[] = intval($item['value']) .','. $item['name'];
}

$xmlContent .= '
	<hash>'.                 md5($verificateCheck) .'</hash>
	<user>'.                 (isset($_SERVER['PHP_AUTH_USER']) ? $_SERVER['PHP_AUTH_USER'] : '') .'</user>
	<avatar>'.               (isset($_SERVER['PHP_AUTH_USER']) ? md5(strtolower(trim($usersArray[$_SERVER['PHP_AUTH_USER']]))) : '') .'</avatar>
	<nagios-config-file>'.   $nagiosConfigFile .'</nagios-config-file>
	<nagios-full-list-url>'. $nagiosFullHostUrl .'</nagios-full-list-url>
	<group-by-service>'.     $groupByService .'</group-by-service>
	<group-by-host>'.        $groupByHost .'</group-by-host>
	<refresh-array>'.        implode(';', $refreshArrayData) .'</refresh-array>
</alerts>';


	return ($isHash) ? md5($verificateCheck) : $xmlContent;
}




function duration($seconds, $withSeconds = true) {
	$d   = floor($seconds / 86400);
	$h   = floor(($seconds - $d * 86400) / 3600);
	$m   = floor(($seconds - $d * 86400 - $h * 3600) / 60);
	$s   = $seconds - $d * 86400 - $h * 3600 - $m * 60;
	$out = "{$d}d {$h}h {$m}m";
	$out.= ($withSeconds) ? " {$s}s" : "";
	return $out;
}

function getNotesUrls() {
	global $getNotesUrls_cacheFile;

	if (file_exists($getNotesUrls_cacheFile) && (time() - filemtime($getNotesUrls_cacheFile)) < 3600) return unserialize(file_get_contents($getNotesUrls_cacheFile));
	exec('egrep "description|notes_url" -r /etc/nagios/services/', $o);
	$out = array();
	foreach ($o as $k=>$el) {
	    if (preg_match('/service_description\s+(.*?)$/', $el, $match)) {
	        if (preg_match('/notes_url\s+(.*?)$/', $o[$k+1], $match2)) {
				$out[$match[1]] = $match2[1];
    	    }
	    }
	}
	file_put_contents($getNotesUrls_cacheFile, serialize($out));
	return $out;
}

function getDepends() {
	global $getDepends_cacheFile;
	
    if (file_exists($getDepends_cacheFile) && (time() - filemtime($getDepends_cacheFile)) < 3600) return unserialize(file_get_contents($getDepends_cacheFile));
    exec('egrep "description|notes" -r /etc/nagios/services/|grep -v notes_url', $o);
    $out = array();
    foreach ($o as $k=>$el) {
        if (preg_match('/service_description\s+(.*?)$/', $el, $match)) {
            if (preg_match('/notes\s+depends on (.*?)$/', $o[$k+1], $match2)) {
                $out[$match[1]] = $match2[1];
            }
        }
    }
    file_put_contents($getDepends_cacheFile, serialize($out));
    return $out;
}

function parseToXML($htmlStr) {

    $htmlStr = preg_replace('/[^\x{0009}\x{000a}\x{000d}\x{0020}-\x{D7FF}\x{E000}-\x{FFFD}]+/u', ' ', $htmlStr);
    $htmlStr = preg_replace('/(?:
                  \xF0[\x90-\xBF][\x80-\xBF]{2}      # planes 1-3
                | [\xF1-\xF3][\x80-\xBF]{3}          # planes 4-15
                | \xF4[\x80-\x8F][\x80-\xBF]{2}      # plane 16
            )/xs', '', $htmlStr);

    $xmlStr = htmlspecialchars($htmlStr, ENT_QUOTES | ENT_XML1);
    return $xmlStr;
}


