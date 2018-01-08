#!/usr/bin/php
<?php

include_once 'htdocs/config/config.php';

/*
$path - path to *_raw file containing states in the format of one measurement = one state in on byte on the same line, last measurement in the end
$stateToAnalyze = 0/1/2, normally 2 to analyze CRITICAL
$percentily in %%, e.g. 70 (not 0.7)

returns number of measurements from the end during which the state was in desired state with >= desired percentile
*/

class nagiosPercentile
{
    function __construct()
    {
        global $statusFile_global;
        global $nagiosPercentileUrl;

        $this->statusFile_global   = $statusFile_global;
        $this->nagiosPercentileUrl = $nagiosPercentileUrl;
        $this->statusFile          = file_get_contents($this->statusFile_global);

        $this->comments    = [];
        $this->statuses    = [];
        $this->percentiles = [];
        $this->durations   = [];
    }

    public function calculatePercentile() {
        $this->setComments();
        $this->setStatuses();

        $this->calculateAllAlerts();
    }
    private function calculateAllAlerts() {
        @mkdir($this->nagiosPercentileUrl);

        foreach ($this->statuses as $item) {
            @mkdir("{$this->nagiosPercentileUrl}/{$item['host']}", 0666, true);

            $rawFilePath = "{$this->nagiosPercentileUrl}/{$item['host']}/{$item['serviceHash']}_raw";

            if (($item['acked'] || $item['sched']) && $this->comments[$item['hostService']] != 'temp') {
                @unlink($rawFilePath);
                continue;
            }

            if (file_exists($rawFilePath) && (time() - filemtime($rawFilePath)) > 60 * 10) {
                @unlink($rawFilePath);
            }

            file_put_contents($rawFilePath, $item['state'], FILE_APPEND);

            $durations[$item['hostService']] = $this->calcDuration($rawFilePath, array(1,2,3), 100);

            if ($percentile = $this->calcDuration($rawFilePath, array(2), 50) && $percentile > 0) {
                $this->percentiles[$item['hostService']] = $percentile;
            }

            if (calcDuration($rawFilePath, array(0), 90) > 180) {
                @unlink($rawFilePath); // resetting the raw file after few hours of OK at 90%
            }
        }

        file_put_contents("{$this->nagiosPercentileUrl}/alerts_critical_50pct", serialize($this->percentiles));
        file_put_contents("{$this->nagiosPercentileUrl}/durations", serialize($this->durations));
    }
    private function setStatuses() {
        $pregServiceStatus  = '/servicestatus {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?service_description=(?P<service>.*?)\n'.
            '.*?current_state=(?P<state>.*?)\n'.
            '.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
            '.*?scheduled_downtime_depth=(?P<sched>.*?)\n'.
            '.*?}/is';

        if (!preg_match_all($pregServiceStatus, $this->statusFile, $matches)) die("ERROR: no matches found\n");

        foreach ($matches['host'] as $k=>$host) {
            $this->statuses[] = [
                'host'        => $host,
                'service'     => $matches['service'][$k],
                'hostService' => $host . '_' . $matches['service'][$k],
                'serviceHash' => md5($matches['service'][$k]),
                'state'       => $matches['state'][$k],
                'acked'       => $matches['acked'][$k],
                'sched'       => $matches['sched'][$k],
            ];
        }
    }
    private function setComments() {
        $pregServiceComment = '/(servicedowntime|servicecomment) {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?service_description=(?P<service>.*?)\n'.
            '.*?(comment|comment_data)=(?P<comment>.*?)\n'.
            '.*?}/is';

        if (preg_match_all($pregServiceComment, $this->statusFile, $matches)) {
            foreach ($matches['host'] as $k=>$host) {
                $this->comments[$host.'_'.$matches['service'][$k]] = $matches['comment'][$k];
            }
        }
    }
    private function calcDuration($path, $statesToAnalyze, $percentile) {
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
        $firstOccurrenceFound = false;
        for ($n=0;$n<=strlen($data) - 1;$n++) {
            if (!$firstOccurrenceFound and !in_array($data[$n], $statesToAnalyze)) continue;
            if ($percentiles[$n] >= $percentile) return strlen($data) - $n;
        }

        return 0;
    }
}

$percentile = new nagiosPercentile;
$percentile->calculatePercentile();
