<?php

include_once 'config/config.php';

if ($memcacheEnabled) {
	$memcache = new Memcache;
	$memcache->connect($memcacheHost, $memcachePort);
}

date_default_timezone_set("America/New_York");

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
	global $icinga;
	global $memcacheHost;
	global $memcachePort;
	global $memcache;
	global $memcacheName;
	global $memcacheEnabled;
	
	if ($memcacheEnabled) {
		$memcache->set("nagiosUI_{$memcacheName}_check", "started", 0, 10);
	}
	
$xmlContent = '<alerts sort="1">
';

	$verificateCheck    = '';
	$pregHostStatus     = '/hoststatus {'.
							'[^{}]*?host_name=(?P<host>[^{}]*?)\n'.
							'[^{}]*?current_state=([^0])\n'.
							'[^{}]*?plugin_output=(?P<plugin_output>[^{}]*?)\n'.
							'[^{}]*?last_check=(?P<last_check>[^{}]*?)\n'.
							'[^{}]*?current_attempt=(?P<attempts>[^{}]*?)\n'.
							'[^{}]*?max_attempts=(?P<max_attempts>[^{}]*?)\n'.
							'[^{}]*?last_state_change=(?P<last_status_change>[^{}]*?)\n'.
							'.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
							'.*?scheduled_downtime_depth=(?P<scheduled>.*?)\n'.
						 '[^{}]*?}/is';
if ($icinga) {
	$pregServiceStatus  = '/servicestatus {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?current_state=(?P<state>.*?)\n'.
							'.*?plugin_output=(?P<plugin_output>.*?)\n'.
							'.*?last_check=(?P<last_check>.*?)\n'.
							'.*?current_attempt=(?P<attempts>.*?)\n'.
							'.*?max_attempts=(?P<max_attempts>.*?)\n'.
							'.*?last_state_change=(?P<last_status_change>.*?)\n'.
							'.*?next_check=(?P<next_check>.*?)\n'.
							'.*?active_checks_enabled=(?P<active_checks_enabled>.*?)\n'.
							'.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
							'.*?scheduled_downtime_depth=(?P<scheduled>.*?)\n'.
						 '.*?}/is';
	$pregServiceComment = '/servicecomment {'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?entry_type=(?P<entry_type>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?comment_data=(?P<comment>.*?)\n'.
						  '.*?}/is';
	$pregDowntimeComment = '/servicedowntime {'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?downtime_id=(?P<downtime_id>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?start_time=(?P<start_time>.*?)\n'.
							'.*?end_time=(?P<end_time>.*?)\n'.
							'.*?duration=(?P<duration>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?comment=(?P<comment>.*?)\n'.
						  '.*?}/is';
} else {
	$pregServiceStatus  = '/servicestatus {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?current_state=(?P<state>.*?)\n'.
							'.*?current_attempt=(?P<attempts>.*?)\n'.
							'.*?max_attempts=(?P<max_attempts>.*?)\n'.
							'.*?last_state_change=(?P<last_status_change>.*?)\n'.
							'.*?plugin_output=(?P<plugin_output>.*?)\n'.
							'.*?last_check=(?P<last_check>.*?)\n'.
							'.*?next_check=(?P<next_check>.*?)\n'.
							'.*?active_checks_enabled=(?P<active_checks_enabled>.*?)\n'.
							'.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
							'.*?scheduled_downtime_depth=(?P<scheduled>.*?)\n'.
						 '.*?}/is';
	$pregServiceComment = '/servicecomment {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?entry_type=(?P<entry_type>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?comment_data=(?P<comment>.*?)\n'.
						  '.*?}/is';
	$pregDowntimeComment = '/servicedowntime {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?downtime_id=(?P<downtime_id>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?start_time=(?P<start_time>.*?)\n'.
							'.*?end_time=(?P<end_time>.*?)\n'.
							'.*?duration=(?P<duration>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?comment=(?P<comment>.*?)\n'.
						  '.*?}/is';
}
	$pregHostDownComment = '/hostdowntime {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?downtime_id=(?P<downtime_id>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?comment=(?P<comment>.*?)\n'.
						  '.*?}/is';
	$pregHostSchedComment = '/hostcomment {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?entry_type=(?P<entry_type>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?start_time=(?P<start_time>.*?)\n'.
							'.*?end_time=(?P<end_time>.*?)\n'.
							'.*?duration=(?P<duration>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?comment_data=(?P<comment>.*?)\n'.
						  '.*?}/is';
						  

	if ($xmlFile) {
		$files = glob($xmlArchive.$_GET['file']."*.log");
		
		if (count($files) == 1 and preg_match('/'.preg_quote($xmlArchive, '/').'\d\d\d\d\d\d\d\d_\d\d\d\d\d\d\.log/', $files[0])) {
			if ($memcacheEnabled) {
				$memcache->delete("nagiosUI_{$memcacheName}_check");
			}
			return file_get_contents($files[0]);
		}
	}
	
	$statusFile = file_get_contents($statusFile_global);
	
	preg_match_all($pregHostStatus, $statusFile, $downHostsMatches);
	preg_match_all($pregServiceStatus, $statusFile, $matches);

	if (!count($matches) || !count($matches['host'])) {
		http_response_code(404);
		die;
	}
	
	$ackAndSchedMatches = mergeComments([
								returnComments($pregServiceComment, $statusFile, false),
								returnComments($pregDowntimeComment, $statusFile, false),
								returnComments($pregHostDownComment, $statusFile, true),
								returnComments($pregHostSchedComment, $statusFile, true)
							]);
	$alertsPercentile   = @unserialize(file_get_contents($alertsPercentile_global));
	$durationsFromFile  = @unserialize(file_get_contents($durationsFromFile_global));
	$notesUrls          = getNotesUrls();
	$depends            = getDepends();

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
            'last_check'         => $matches['last_check'][$k],
            'active_enabled'     => $matches['active_checks_enabled'][$k],
            'next_check'         => $matches['next_check'][$k],
        );
    }
    unset($matches);

    foreach ($downHostsMatches['host'] as $k=>$host) { // copying down host alerts to normal service alerts
        unset($hosts[$host]);

        $hosts[$host]['SERVER IS UP'] = array(
            'state'              => 2, // down host is always shown as CRITICAL alert
            'acked'              => $downHostsMatches['acked'][$k],
            'scheduled'          => $downHostsMatches['scheduled'][$k],
            'last_status_change' => $downHostsMatches['last_status_change'][$k],
            'plugin_output'      => $downHostsMatches['plugin_output'][$k],
            'attempts'           => $downHostsMatches['attempts'][$k],
            'max_attempts'       => $downHostsMatches['max_attempts'][$k],
            'last_check'         => $downHostsMatches['last_check'][$k],
            'active_enabled'     => 0,
            'next_check'         => 0,
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

            if (
                   $attrs['state'] > 0
                || (!$attrs['state'] && isset($attrs['scheduled']) && $attrs['scheduled'])
                || ($criticalPercentileDuration && $criticalPercentileDuration > 4*3600)
                || (!$attrs['state'] && !$attrs['last_status_change'] && $attrs['active_enabled'])
            ) {
                $statesAr       = array(0 => 'OK', 1 => 'WARNING', 2 => 'CRITICAL', 3 => 'UNKNOWN');
                $state          = $statesAr[$attrs['state']];
                $origState      = '';
                $serviceEncoded = urlencode($service);
                $pluginOutput   = nl2br(htmlentities(str_replace(array('<br>', '<br/>'), array("\n", "\n"), $attrs['plugin_output']), ENT_XML1));
                $pending        = (!$attrs['state'] && !$attrs['last_status_change'] && $attrs['active_enabled']) ? 1 : 0;

                if ($service == 'SERVER IS UP') {
                    $notesUrl   = (isset($notesUrls[$host])) ? $notesUrls[$host] : '';
                } else {
                    $notesUrl   = (isset($notesUrls[$service])) ? $notesUrls[$service] : '';
                }
				
				if (preg_match("/zabbix_redirect/", $notesUrl)) {
					$notesUrl = strstr($notesUrl, 'host=', true) . "host={$host}&" . strstr($notesUrl, 'item=', false);
				}
				
				if ($criticalPercentileDuration /*&& $criticalPercentileDuration > 60*4*/ && (!isset($attrs['acked']) || !$attrs['acked']) && (!isset($attrs['scheduled']) || !$attrs['scheduled']) && $criticalPercentileDuration * 60 - (time() - $attrs['last_status_change']) > 300) {
					$durationSec = $criticalPercentileDuration * 60;
					$duration    = duration($durationSec, false)." (50%)";
					$origState   = $state;
					$state       = 'CRITICAL';
				}
				else {
					$durationSec = (isset($durationsFromFile[$host.'_'.$service]) and $durationsFromFile[$host.'_'.$service] * 60 < time() - $attrs['last_status_change']) ? $durationsFromFile[$host.'_'.$service] * 60 : time() - $attrs['last_status_change'];
					$duration    = duration($durationSec, false);
				}
				
				$ackedStatus   = (int)$attrs['acked'];
				$ackComment    = '';
				$schedComment  = '';
				$downtime_id   = '';
				$ackLastTemp   = '';
				$ackLastAuthor = '';
				$schedStart    = '';
				$schedEnd      = '';
				$schedDuration = '';
				
				if (isset($ackAndSchedMatches[$host][$service])) {
					$tmpAckComments   = array();
					$tmpSchedComments = array();
					$tmpDowntimeId    = array();
					$tmpAckAuthor     = array();
					$tmpAckTemp       = array();
					$tmpSchedAuthor   = array();
					$tmpSchedTemp     = array();
					
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
							if ($tmpComments['schedComment'] == 'planned') {
								$tmpValue = 'planned';
							} else {
								$tmpValue  = preg_replace('/(#(\d+))/', $nagiosCommentUrl, $tmpComments['schedComment']);
								$tmpValue  = "'{$tmpValue}' by {$tmpComments['schedAuthor']}";
								$tmpValue .= ($tmpComments['schedCommentDate']) ? '<br />added: '. date('M j H:i', intval($tmpComments['schedCommentDate'])) : '';
							}
							
							$tmpSchedComments[] = $tmpValue;
							$tmpSchedAuthor[]   = $tmpComments['schedAuthor'];
							$tmpSchedTemp[]     = $tmpComments['schedComment'];
							
							if ($tmpComments['start_time']) {
								$schedStart = $tmpComments['start_time'];
							}
							
							if ($tmpComments['end_time']) {
								$schedEnd = $tmpComments['end_time'];
							}
							
							if ($tmpComments['duration']) {
								$schedDuration = $tmpComments['duration'];
							}
						}
						if ($tmpComments['downtime_id']) {
							$tmpDowntimeId[] = $tmpComments['downtime_id'];
						}
					}

					$ackComment      = implode('<br /><br />', $tmpAckComments);
					$schedComment    = implode('<br /><br />', $tmpSchedComments);
					$downtime_id     = (!empty($tmpDowntimeId))  ? implode(',', $tmpDowntimeId)  : '';
					$ackLastTemp     = (!empty($tmpAckTemp))     ? end($tmpAckTemp)     : '';
					$ackLastAuthor   = (!empty($tmpAckAuthor))   ? end($tmpAckAuthor)   : '';
					$schedLastTemp   = (!empty($tmpSchedTemp))   ? end($tmpSchedTemp)   : '';
					$schedLastAuthor = (!empty($tmpSchedAuthor)) ? end($tmpSchedAuthor) : '';
				}

				$scheduled       = (int)$attrs['scheduled'];
				$last_check      = date('m-d-Y H:i:s', $attrs['last_check']);
				$attempt         = $attrs['attempts']/$attrs['max_attempts'];
				$host_or_service = ($service == "SERVER IS UP") ? "host" : "service";
				$userAvatar      = (isset($usersArray[$ackLastAuthor])) ? $usersArray[$ackLastAuthor] : '';
				$scheduserAvatar = (isset($usersArray[$schedLastAuthor])) ? $usersArray[$schedLastAuthor] : '';
				
				$host = parseToXML($host);
				$state = parseToXML($state);

$xmlContent .= '	<alert state="'. $state .'" origState="'. parseToXML($origState) .'">
		<host>'.               $host .'</host>
		<host-url>'.           hostUrl($host) .'</host-url>
		<service>'.            parseToXML($service) .'</service>
		<service-url>'.        serviceUrl($host, parseToXML($serviceEncoded)) .'</service-url>
		<notes_url>'.          parseToXML($notesUrl) .'</notes_url>
		<status>'.             $state .'</status>
		<acked>'.              parseToXML($ackedStatus) .'</acked>
		<sched>'.              parseToXML($scheduled) .'</sched>
		<downtime_id>'.        parseToXML($downtime_id) .'</downtime_id>
		<ack_last_temp>'.      parseToXML($ackLastTemp) .'</ack_last_temp>
		<ack_last_author>'.    parseToXML($ackLastAuthor) .'</ack_last_author>
		<sched_last_temp>'.    parseToXML($schedLastTemp) .'</sched_last_temp>
		<sched_last_author>'.  parseToXML($schedLastAuthor) .'</sched_last_author>
		<quick_ack_author>'.   md5(strtolower(trim($userAvatar))) .'</quick_ack_author>
		<planned_author>'.     md5(strtolower(trim($scheduserAvatar))) .'</planned_author>
		<sched_comment>'.      parseToXML($schedComment) .'</sched_comment>
		<ack_comment>'.        parseToXML($ackComment) .'</ack_comment>
		<last_check>'.         parseToXML($last_check) .'</last_check>
		<last_check_sec>'.     parseToXML($attrs['last_check']) .'</last_check_sec>
		<durationSec>'.        parseToXML($durationSec) .'</durationSec>
		<durationSec9Digits>'. parseToXML(sprintf('%09d', $durationSec)) .'</durationSec9Digits>
		<duration>'.           parseToXML($duration) .'</duration>
		<attempt>'.            parseToXML($attempt) .'</attempt>
		<status_information>'. parseToXML($pluginOutput) .'</status_information>
		<host_or_service>'.    parseToXML($host_or_service) .'</host_or_service>
		<sched_start>'.        parseToXML($schedStart) .'</sched_start>
		<sched_end>'.          parseToXML($schedEnd) .'</sched_end>
		<sched_duration>'.     parseToXML($schedDuration) .'</sched_duration>
		<pending>'.            parseToXML($pending) .'</pending>
		<next_check>'.         parseToXML($attrs['next_check']) .'</next_check>
	</alert>
';
		
			$verificateCheck .= $state . $origState . $host . $service . $serviceEncoded . $ackLastTemp . $attempt;
			$verificateCheck .= $notesUrl . $ackedStatus . $scheduled . $downtime_id . $ackLastAuthor . $pluginOutput;
			$verificateCheck .= $schedComment . $ackComment . $last_check . $schedLastAuthor . $schedLastTemp;

		}
	}
}
$refreshArrayData = [];
foreach ($refreshArray as $item) {
	$refreshArrayData[] = intval($item['value']) .','. $item['name'];
}

$xmlContent .= '
	<hash>'.                 md5($verificateCheck) .'</hash>
	<nagios-config-file>'.   parseToXML($nagiosConfigFile) .'</nagios-config-file>
	<nagios-full-list-url>'. parseToXML($nagiosFullHostUrl) .'</nagios-full-list-url>
	<group-by-service>'.     parseToXML($groupByService) .'</group-by-service>
	<group-by-host>'.        parseToXML($groupByHost) .'</group-by-host>
	<refresh-array>'.        parseToXML(implode(';', $refreshArrayData)) .'</refresh-array>
</alerts>';

	if ($memcacheEnabled) {
		if (!$memcache->get("nagiosUI_{$memcacheName}_verify") || !$memcache->get("nagiosUI_{$memcacheName}_data") || $memcache->get("nagiosUI_{$memcacheName}_verify") != md5($verificateCheck)) {
			$memcache->set("nagiosUI_{$memcacheName}_verify", md5($verificateCheck), 0, 120);
			$memcache->set("nagiosUI_{$memcacheName}_data", serialize($xmlContent), 0, 120);
		}
		
		$memcache->delete("nagiosUI_{$memcacheName}_check");
		
		return true;
	}
	
	return ($isHash) ? md5($verificateCheck) : $xmlContent;
}

function returnMemcacheData($xmlFile) {
	global $memcache;
	global $memcacheName;
	global $memcacheEnabled;

	if ($xmlFile) {
		return returnDataList(false, $xmlFile);
	}
	
	if ($memcacheEnabled) {
		if (!$memcache->get("nagiosUI_{$memcacheName}_check") && (!$memcache->get("nagiosUI_{$memcacheName}_verify") || !$memcache->get("nagiosUI_{$memcacheName}_data"))) {
			returnDataList(false, $xmlFile);
		}
		
		return unserialize($memcache->get("nagiosUI_{$memcacheName}_data"));
	}
	
	return returnDataList(false, $xmlFile);
}
function mergeComments($arrays) {
	$return = [];
	
	foreach ($arrays as $array) {
		foreach ($array as $host=>$data) {
			foreach ($data as $service=>$item) {
				foreach ($item as $record) {
					$return[$host][$service][] = $record;
				}
			}
		}
	}
	
	return $return;
}
function returnComments($comments, $statusFile, $isHost) {
	$return = [];
	
	if (preg_match_all($comments, $statusFile, $matches)) {
		foreach ($matches['host'] as $k=>$host) {
			if (isset($matches['downtime_id'])) {
				$type = 'sched';
				$id   = $matches['downtime_id'][$k];
			} else {
				$type = ($matches['entry_type'][$k] == 2) ? 'other' : 'ack';
				$id   = $matches['entry_type'][$k];
			}
			
			$name = ($isHost) ? 'SERVER IS UP' : $matches['service'][$k];
			
			$return[$host][$name][] = array(
				'ackAuthor'        => ($type == 'ack')   ? $matches['author'][$k]     : '',
				'ackComment'       => ($type == 'ack')   ? $matches['comment'][$k]    : '',
				'ackCommentDate'   => ($type == 'ack')   ? $matches['entry_time'][$k] : '',
				'schedAuthor'      => ($type == 'sched') ? $matches['author'][$k]     : '',
				'schedComment'     => ($type == 'sched') ? $matches['comment'][$k]    : '',
				'schedCommentDate' => ($type == 'sched') ? $matches['entry_time'][$k] : '',
				'downtime_id'      => ($type != 'other') ? $id : '',
				'start_time'       => ($type == 'sched') ? $matches['start_time'][$k] : '',
				'end_time'         => ($type == 'sched') ? $matches['end_time'][$k] : '',
				'duration'         => ($type == 'sched') ? $matches['duration'][$k] : '',
			);
		}
	}
	
	return $return;
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

    $out = array();
    exec('egrep "description|notes_url" -r /etc/nagios/services/', $services);
    exec('egrep "host_name|notes_url" -r /etc/nagios/hosts', $hosts);

    foreach ($services as $k=>$el) {
        if (preg_match('/service_description\s+(.*?)$/', $el, $match)) {
            if (preg_match('/notes_url\s+(.*?)$/', $services[$k+1], $match2)) {
                $out[$match[1]] = $match2[1];
            }
        }
    }

    foreach ($hosts as $k=>$el) {
        if (preg_match('/notes_url\s+(.*?)$/', $el, $match)) {
            if (preg_match('/host_name\s+(.*?)$/', $hosts[$k+1], $match2)) {
                $out[$match2[1]] = $match[1];
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

function removePlannedMaintenance($delete) {
	$pattern  = returnPlannedPattern($delete);
	$commands = explode(',', $pattern[0]);
	$array    = json_decode(json_encode(simplexml_load_string(returnMemcacheData())),TRUE);
	
	if (isset($array['alert']['host'])) {
		$array['alert'] = [$array['alert']];
	}
	
	foreach ($array['alert'] as $item) {
		$tempSchedCommen = (!is_array($item['sched_last_temp']))      ? $item['sched_last_temp']      : implode(' ', $item['sched_last_temp']);
		$host            = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
		$service         = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
		$downtimeId      = (!is_array($item['downtime_id']))          ? $item['downtime_id']          : implode(',', $item['downtime_id']);
		$downtimeId      = explode(',', $downtimeId);
		$text            = returnPlannedText($host, $service);
		
		foreach ($downtimeId as $downtime) {
			if ($tempSchedCommen == 'planned' && $downtimeId != 4) {
				foreach ($commands as $command) {
					$command = returnPlannedCommand($command, $pattern);
					
					if (preg_match("/$command/iu", $text)) {
						removeSchedulePlanned($downtime);
					}
				}
			}
		}
	}
}
function writePlanned($data) {
	global $plannedUrl;
	
	file_put_contents($plannedUrl, json_encode($data, true));
}
function returnPlanned() {
	global $plannedUrl;
	
	return json_decode(file_get_contents($plannedUrl), true);
}
function returnPlannedPattern($command) {
	$pattern = $command;
	$pattern = str_replace("*", ".+", $pattern);
	$pattern = str_replace("?", ".", $pattern);
	$pattern = str_replace("&quot;", "\"", $pattern);
	$pattern = explode('_', $pattern);
	
	return $pattern;
}
function returnPlannedCommand($command, $pattern) {
	$command = trim($command);
	$command = (isset($pattern[1])) ? ($command . ' ' . $pattern[1]) : $command;
	$command = str_replace(".+.+", ".+", $command);
	
	return $command;
}
function returnPlannedText($host, $service) {
	return " " . $host . " " . $service . " ";
}
function unAckForPlanned($host, $service, $hostOrService) {
	global $nagiosPipe;
	
	$f = fopen($nagiosPipe, 'w');
	
	if ($hostOrService == 'service') {
		fwrite($f, "[".time()."] REMOVE_SVC_ACKNOWLEDGEMENT;{$host};{$service}\n");
	} else if ($hostOrService == 'host') {
		fwrite($f, "[".time()."] REMOVE_HOST_ACKNOWLEDGEMENT;{$host}\n");
	}
	
	fclose($f);
	
	return true;
}

function schedulePlanned($host, $service, $end, $user) {
	global $nagiosPipe;
	
	$f = fopen($nagiosPipe, 'w');
	fwrite($f, "[".time()."] SCHEDULE_SVC_DOWNTIME;{$host};{$service};".time().";{$end};1;0;1;{$user};planned\n");
	fclose($f);
	
	return true;
}
function removeSchedulePlanned($downtimeId) {
	global $nagiosPipe;
	
	$f = fopen($nagiosPipe, 'w');
	fwrite($f, "[".time()."] DEL_SVC_DOWNTIME;{$downtimeId}\n");
	fclose($f);
}
function findPlanned($host, $service, $user, $schedulePlanned = true) {
    $planned = returnPlanned();

    foreach ($planned as $key => $plan) {
        $pattern  = returnPlannedPattern($plan['command']);
        $commands = explode(',', $pattern[0]);

        foreach ($commands as $command) {
            $command = returnPlannedCommand($command, $pattern);
            $text    = returnPlannedText($host, $service);

            if (preg_match("/$command/iu", $text) && $plan['end'] > time()) {
                if (isset($plan['list']) && isset($plan['list'][$host]) && isset($plan['list'][$host][$service]) && $plan['list'][$host][$service] > time()) {
                    return false;
                } else {
                    if ($schedulePlanned) {
                        $results = [];

                        foreach ($planned as $plannedKey => $plannedValue) {
                            $results[$plannedKey] = $plannedValue;

                            if ($key == $plannedKey) {
                                if (!isset($plan['list'])) {
                                    $results[$plannedKey]['list'] = [];
                                }

                                if (!isset($plan['list'][$host])) {
                                    $results[$plannedKey]['list'][$host] = [];
                                }

                                if (!isset($plan['list'][$host][$service])) {
                                    $results[$plannedKey]['list'][$host][$service] = '';
                                }

                                $results[$plannedKey]['list'][$host][$service] = time() + 10;
                            }
                        }

                        writePlanned($results);
                        schedulePlanned($host, $service, $plan['end'], $plan['user']);
                    }

                    return true;
                }
            }
        }
    }

    return false;
}
function implode_r($g, $p) {
    return is_array($p) ?
            implode($g, array_map(__FUNCTION__, array_fill(0, count($p), $g), $p)) : 
            $p;
}
$planned = returnPlanned();