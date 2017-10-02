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
        global $icinga;
        global $statusFile_global;
        global $icingaDB;
        global $icingaApiUser;
        global $icingaApiPass;
        global $icingaApiHosts;
        global $nagiosPercentileUrl;

        $this->icinga                   = $icinga;
        $this->statusFile_global        = $statusFile_global;
        $this->icingaDB                 = $icingaDB;
        $this->icingaApiUser            = $icingaApiUser;
        $this->icingaApiPass            = $icingaApiPass;
        $this->icingaApiHosts           = $icingaApiHosts;
        $this->icingaApiHost            = $this->findAliveHost();
        $this->nagiosPercentileUrl      = $nagiosPercentileUrl;

        $this->comments    = [];
        $this->statuses    = [];
        $this->percentiles = [];
        $this->durations   = [];

        if (!$this->icingaDB) {
            $this->statusFile = file_get_contents($this->statusFile_global);
        }
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
        if ($this->icingaDB) {
            $this->setStatusesFromIcingaApi();
        } else {
            $this->setStatusesFromStatusDat();
        }
    }
    private function setStatusesFromIcingaApi() {
        $data = [
            'joins'  => ['host.display_name'],
            'attrs'  => ['display_name', 'state', 'acknowledgement', 'downtime_depth'],
        ];

        exec('curl -k -s -u '. $this->icingaApiUser .':'. $this->icingaApiPass .' -H "Accept: application/json" -X POST -H "X-HTTP-Method-Override: GET" "'. $this->icingaApiHost .'/v1/objects/services" -d \''. json_encode($data) .'\'  2>&1', $output);

        foreach (json_decode($output[0])->results as $item) {
            $this->statuses[] = [
                'host'        => $item->joins->host->display_name,
                'service'     => $item->attrs->display_name,
                'hostService' => $item->joins->host->display_name . '_' . $item->attrs->display_name,
                'serviceHash' => md5($item->attrs->display_name),
                'state'       => $item->attrs->state,
                'acked'       => $item->attrs->acknowledgement,
                'sched'       => $item->attrs->downtime_depth,
            ];
        }
    }
    private function setStatusesFromStatusDat() {
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
        if ($this->icingaDB) {
            $this->setCommentsFromIcingaApi();
        } else {
            $this->setCommentsFromStatusDat();
        }
    }
    private function setCommentsFromIcingaApi() {
        $data = [
            'joins'  => ['host.display_name', 'service.display_name'],
            'attrs'  => ['text'],
        ];

        exec('curl -k -s -u '. $this->icingaApiUser .':'. $this->icingaApiPass .' -H "Accept: application/json" -X POST -H "X-HTTP-Method-Override: GET" "'. $this->icingaApiHost .'/v1/objects/comments" -d \''. json_encode($data) .'\'  2>&1', $outputAck);

        foreach (json_decode($outputAck[0])->results as $item) {
            $this->comments[$item->joins->host->display_name.'_'.$item->joins->service->display_name] = $item->attrs->text;
        }



        $data['attrs'] = ['comment'];

        exec('curl -k -s -u '. $this->icingaApiUser .':'. $this->icingaApiPass .' -H "Accept: application/json" -X POST -H "X-HTTP-Method-Override: GET" "'. $this->icingaApiHost .'/v1/objects/downtimes" -d \''. json_encode($data) .'\'  2>&1', $outputSched);

        foreach (json_decode($outputSched[0])->results as $item) {
            $this->comments[$item->joins->host->display_name.'_'.$item->joins->service->display_name] = $item->attrs->comment;
        }
    }
    private function setCommentsFromStatusDat() {
        if ($this->icinga) {
            $pregServiceComment = '/(servicedowntime|servicecomment) {'.
                '.*?service_description=(?P<service>.*?)\n'.
                '.*?host_name=(?P<host>.*?)\n'.
                '.*?(comment|comment_data)=(?P<comment>.*?)\n'.
                '.*?}/is';
        } else {
            $pregServiceComment = '/(servicedowntime|servicecomment) {'.
                '.*?host_name=(?P<host>.*?)\n'.
                '.*?service_description=(?P<service>.*?)\n'.
                '.*?(comment|comment_data)=(?P<comment>.*?)\n'.
                '.*?}/is';
        }

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
    private function findAliveHost() {
        $data = ['attrs' => ['active']];

        foreach ($this->icingaApiHosts as $host) {
            $output = [];

            exec('curl -k -s -u '. $this->icingaApiUser .':'. $this->icingaApiPass .' -H "Accept: application/json" -X POST -H "X-HTTP-Method-Override: GET" "'. $host .'/v1/objects/hosts" -d \''. json_encode($data) .'\' 2>&1', $output);

            if (count($output) && isset($output[0]) && isset(json_decode($output[0])->results) && count(json_decode($output[0])->results)) {
                return $host;
            }
        }

        return isset($this->icingaApiHosts[0]) ? $this->icingaApiHosts[0] : '';
    }
}



$percentile = new nagiosPercentile;
$percentile->calculatePercentile();
