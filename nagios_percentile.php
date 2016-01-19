#!/usr/bin/php
<?php

include_once 'htdocs/config/nagios2Config.php';

/*
$path - path to *_raw file containing states in the format of one measurement = one state in on byte on the same line, last measurement in the end
$stateToAnalyze = 0/1/2, normally 2 to analyze CRITICAL
$percentily in %%, e.g. 70 (not 0.7)

returns number of measurements from the end during which the state was in desired state with >= desired percentile
*/
function calcDuration($path, $statesToAnalyze, $percentile) {
    $data        = trim(file_get_contents($path));
    $passed      = 0;
    $matched     = 0;
    $percentiles = array();
	
    for ($n = strlen($data) - 1; $n >= 0; $n--) {
        if (in_array($data[$n], $statesToAnalyze)) $matched++;
        $passed++;
        $percentiles[$n] = $matched / $passed * 100;
    }
	
    //$percentiles[max] means percentile at the LAST minute
    //$percentiles[0] means percentile at the FIRST minute
    for ($n=0;$n<=strlen($data) - 1;$n++) {
        if ($percentiles[$n] >= $percentile) return strlen($data) - $n;
    }
	
    return 0;
}

$statusFile = file_get_contents($statusFile_global);

$pregServiceComment = '/(servicedowntime|servicecomment) {'.
							'.*?host_name=(?P<host>.*?)\n'.
							'.*?service_description=(?P<service>.*?)\n'.
							'.*?(downtime_id|entry_type)=(?P<entry_type>.*?)\n'.
							'.*?entry_time=(?P<entry_time>.*?)\n'.
							'.*?author=(?P<author>.*?)\n'.
							'.*?(comment|comment_data)=(?P<comment>.*?)\n'.
						  '.*?}/is';
						  
$pregServiceStatus  = '/servicestatus {'.
							'.*?host_name=(.*?)\n'.
							'.*?service_description=(.*?)\n'.
							'.*?current_state=(.*?)\n'.
							'.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
							'.*?scheduled_downtime_depth=(?P<scheduled>.*?)\n'.
						 '.*?}/is';

$comments = array();
if (preg_match_all($pregServiceComment, $statusFile, $ackAndSchedMatches)) {
	foreach ($ackAndSchedMatches['host'] as $k=>$host) {
		$comments[$host.'_'.$ackAndSchedMatches['service'][$k]] = $ackAndSchedMatches['comment'][$k];
	}
} 


if (!preg_match_all($pregServiceStatus, $statusFile, $matches)) die("ERROR: no matches found\n");

$percentileAlerts = array();
$durations        = array();

@mkdir($nagiosPercentileUrl);
foreach ($matches[1] as $k=>$host) {
	$service     = $matches[2][$k];
	$serviceHash = md5($service);
	$state       = $matches[3][$k];
	
	@mkdir("{$nagiosPercentileUrl}/{$host}", 0666, true);
	
	$rawFilePath = "{$nagiosPercentileUrl}/{$host}/{$serviceHash}_raw";
	
	if (($matches['acked'][$k] or $matches['scheduled'][$k]) && $comments[$host.'_'.$service] != 'temp') {
		@unlink($rawFilePath);
		continue;
	}
	
	file_put_contents($rawFilePath, $state, FILE_APPEND);
	
	$durations[$host.'_'.$service] = calcDuration($rawFilePath, array(1,2,3), 100);
	$criticalPercentile            = calcDuration($rawFilePath, array(2), 50);
	
	if ($criticalPercentile > 0) $percentileAlerts[$host.'_'.$service] = $criticalPercentile;
	if (calcDuration($rawFilePath, array(0), 90) > 180) @unlink($rawFilePath); // resetting the raw file after few hours of OK at 90%
}

file_put_contents("{$nagiosPercentileUrl}/alerts_critical_50pct", serialize($percentileAlerts));
file_put_contents("{$nagiosPercentileUrl}/durations", serialize($durations));
