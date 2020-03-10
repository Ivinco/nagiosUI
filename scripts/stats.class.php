<?php

class stats
{
    private $dateTimeFormat = "Y-m-d H:i:s";
    private $history = [];
    private $results = [];
    private $fullResults = [];
    private $calendar;
    private $timeZone;
    private $usersShifts = [];

    function __construct()
    {
        global $serversList;
        global $timeZone;

        $this->db          = new db;
        $this->serversList = $serversList;
        $this->server      = (isset($_GET['server']) && $_GET['server']) ? $_GET['server'] : '';
        $this->list        = (isset($_GET['list'])   && $_GET['list'])   ? $_GET['list']   : '';
        $this->servers     = $this->setServers($this->server, $this->serversList);
        $this->timeZone    = $timeZone;
        $this->calendar    = new calendar;

        $this->timeCorrectionType = (isset($_GET['time_correction_type'])) ? $_GET['time_correction_type'] : '';
        $this->timeCorrectionDiff = (isset($_GET['time_correction_diff'])) ? $_GET['time_correction_diff'] : 0;
    }

    public function returnTabsList()
    {
        $servers = array_keys($this->serversList);
        sort($servers);
        $servers = implode(',', $servers);

        $users = $this->calendar->usersList;
        array_unshift($users, 'Summary report', 'Nobody\'s shift');

        return [
            'serversList'    => 'All,'. $servers,
            'usersList'      => $users,
            'groupByService' => 2,
            'groupByHost'    => 11,
            'refreshArray'   => [
                [ 'value' =>  '10', 'name' => '10 sec' ],
                [ 'value' =>  '20', 'name' => '20 sec' ],
                [ 'value' =>  '40', 'name' => '40 sec' ],
                [ 'value' =>  '60', 'name' =>  '1 min' ],
                [ 'value' => '120', 'name' =>  '2 min' ],
                [ 'value' => '180', 'name' =>  '3 min' ],
                [ 'value' => '300', 'name' =>  '5 min' ],
                [ 'value' => '600', 'name' => '10 min' ],
            ],
        ];
    }

    public function returnStats()
    {
        $this->setFormatedDates();
        $this->validate();
        $this->runCalendar();
        $this->getStats();
        $this->calculateAllData();
        $this->calculateNobodysShift();
        $this->setAverages();

        return $this->results;
    }

    private function validate()
    {
        if (!$this->validateTimestamp($this->from)) {
            $this->returnError('"from" format must be timestamp');
        }
        if (!$this->validateTimestamp($this->to)) {
            $this->returnError('"to" format must be timestamp');
        }
        if (!$this->from || !$this->to) {
            $this->returnError('"from" and "to" must be set.');
        }
    }
    private function validateTimestamp($ts) {
        if ($ts && strlen((string) $ts) == 10 && strval($ts) == $ts) {
            return true;
        }

        return false;
    }
    private function getTs($name) {
        if (isset($_GET[$name])) {
            return (int) $_GET[$name];
        }

        return 0;
    }
    private function returnDateForDb($timestamp) {
        $diff = strtotime(gmdate("Y-m-d H:i:s")) - strtotime(date("Y-m-d H:i:s"));
        $timestamp -= $diff;

        $date = new DateTime("@{$timestamp}");
        $date->setTimezone(new DateTimeZone('UTC'));

        return $date->format('Y-m-d H:i:s');
    }

    private function getStats()
    {
        $this->history = [];
        $this->getStatsDataFromDb();
        $this->results = $this->getStatsByUser();
        $this->results['Summary report'] = $this->calculateByServer($this->from, $this->to, 'Summary report', []);
        $this->results['Nobody\'s shift'] = $this->results['Summary report'];

        return $this->results;
    }
    private function calculateByServer($from, $to, $user, $stats)
    {
        if (!isset($stats[$user])) {
            $stats[$user] = [];
        }

        foreach ($this->history as $server => $data) {
            if (!isset($stats[$user][$server])) {
                $stats[$user][$server] = [
                    'alerts_count' => 0,
                    'unhandled_time' => 0,
                    'quick_acked_time' => 0,
                    'reaction_time' => 0,
                    'reaction_alerts' => 0,
                ];
            }

            foreach ($data as $check_id => $dataList) {
                $alerts    = [];
                $lastAlert = null;

                foreach ($dataList as $key => $record) {
                    $ts = $record['ts'];

                    if ($record['info']) {
                        continue;
                    }

                    if ($ts > $from && $ts < $to) {
                        if (!$alerts && $lastAlert) {
                            $lastAlert['ts'] = $from;
                            $alerts[] = $lastAlert;
                        }

                        $alerts[] = $record;
                    }

                    $lastAlert = $record;
                }

                if (count($alerts) == 1 && $alerts[0]['state'] == 'ok') {
                    unset($alerts[0]);
                }

                if ($alerts) {
                    $last = end($alerts);
                    if ($last['state'] != 'ok') {
                        $last['state']    = 'ok';
                        $last['severity'] = 'unhandled';
                        $last['ts']       = $to;

                        $alerts[] = $last;
                    }
                }

                $stats[$user][$server] = $this->calculateByCheckId($stats[$user][$server], $alerts, $from, $to);
            }
        }

        return $stats[$user];
    }
    private function getStatsByUser()
    {
        $stats = [];

        foreach ($this->usersShifts as $user => $dates) {
            foreach ($dates as $date) {
                $stats[$user] = $this->calculateByServer($date['start'], $date['finish'], $user, $stats);
            }
        }

        return $stats;
    }
    private function calculateByCheckId($stats, $alerts, $from, $to)
    {
        $lastTs          = null;
        $lastQuickAckTs  = null;
        $quickAckStarted = null;
        $alertStarted    = null;

        foreach ($alerts as $alert) {
            $ts       = $alert['ts'];
            $ts       = ($ts > $to)   ? $to   : $ts;
            $ts       = ($ts < $from) ? $from : $ts;
            $severity = $alert['severity'];
            $state    = $alert['state'];

            if ($alert['info']) {
                continue;
            }

            if ($severity == 'unhandled' && $state != 'ok') {
                $alertStarted = true;
                $lastTs = $ts;
                $stats['alerts_count']++;
            }

            if ($severity == 'quick_acked' && !$alertStarted) {
                $alertStarted = true;
                $lastTs = $ts;
                $lastQuickAckTs = $ts;
                $quickAckStarted = true;
                $stats['alerts_count']++;
            }

            if ($severity == 'quick_acked') {
                if ($alertStarted) {
                    $alertStarted = false;
                    $stats['reaction_time'] += ($ts - $lastTs);
                    $stats['reaction_alerts']++;
                }

                $lastQuickAckTs = $ts;
                $quickAckStarted = true;
            }

            if ((in_array($severity, ['acked', 'sched', 'planned_downtime']) || $state == 'ok') && $lastTs) {
                $stats['unhandled_time'] += ($ts - $lastTs);

                if ($alertStarted) {
                    $alertStarted = false;
                    $stats['reaction_time'] += ($ts - $lastTs);
                    $stats['reaction_alerts']++;
                }

                if ($quickAckStarted) {
                    $stats['quick_acked_time'] += ($ts - $lastQuickAckTs);
                    $lastQuickAckTs = false;
                    $quickAckStarted = false;
                }

                $lastTs = null;
            }
        }

        if ($lastTs) {
            $stats['unhandled_time'] += ($to - $lastTs);

            if ($alertStarted) {
                $stats['reaction_time'] += ($to - $lastTs);
                $stats['reaction_alerts']++;
            }

            if ($quickAckStarted) {
                $stats['quick_acked_time'] += ($to - $lastQuickAckTs);
            }
        }

        return $stats;
    }
    private function calculateNobodysShift()
    {
        foreach ($this->results as $name => $stats) {
            if (in_array($name, ['Summary report', 'Nobody\'s shift'])) {
                continue;
            }

            foreach ($stats as $server => $stat) {
                $this->results['Nobody\'s shift'][$server]['alerts_count']     -= $stat['alerts_count'];
                $this->results['Nobody\'s shift'][$server]['unhandled_time']   -= $stat['unhandled_time'];
                $this->results['Nobody\'s shift'][$server]['quick_acked_time'] -= $stat['quick_acked_time'];
                $this->results['Nobody\'s shift'][$server]['reaction_time']    -= $stat['reaction_time'];
                $this->results['Nobody\'s shift'][$server]['reaction_alerts']  -= $stat['reaction_alerts'];
            }
        }

        foreach ($this->results['Nobody\'s shift'] as $server => $stats) {
            foreach ($stats as $name => $stat) {
                if ($stat < 0) {
                    $this->results['Nobody\'s shift'][$server][$name] = 0;
                }
            }
        }
    }
    private function calculateAllData()
    {
        foreach ($this->results as $name => $stats) {
            $result = [
                'alerts_count'     => 0,
                'unhandled_time'   => 0,
                'quick_acked_time' => 0,
                'reaction_time'    => 0,
                'reaction_alerts'  => 0,
            ];

            foreach ($stats as $server => $stat) {
                $result['alerts_count']     += $stat['alerts_count'];
                $result['unhandled_time']   += $stat['unhandled_time'];
                $result['quick_acked_time'] += $stat['quick_acked_time'];
                $result['reaction_time']    += $stat['reaction_time'];
                $result['reaction_alerts']  += $stat['reaction_alerts'];
            }

            $this->results[$name]['All'] = $result;
        }
    }
    private function runCalendar()
    {
        $this->calendar->setTime($this->from, $this->to);
        $this->usersShifts = $this->calendar->getEvents();
    }
    private function setAverages()
    {
        foreach ($this->results as $name => $stats) {
            foreach ($stats as $server => $stat) {
                if ($stat['reaction_alerts']) {
                    $this->results[$name][$server]['reaction_avg'] = round($stat['reaction_time'] / $stat['reaction_alerts'] , 2);
                }
            }
        }
    }
    private function returnError($message)
    {
        http_response_code(400);
        die($message);
    }
    private function setFormatedDates()
    {
        $this->from = $this->getTs('from');
        $this->to   = $this->getTs('to');
    }
    private function setServers($server, $serversList) {
        $servers = [];
        if (!$server || $server == 'All') {
            foreach ($serversList as $key => $value) {
                $servers[] = $key;
            }
        } else {
            $servers[] = $server;
        }

        return $servers;
    }
    private function getStatsDataFromDb()
    {
        foreach ($this->servers as $item) {
            $from = $this->returnDateForDb($this->from);
            $to   = $this->returnDateForDb($this->to);

            $this->history[$item] = $this->db->historyGetUnfinishedAlertsWithPeriod($item, $from, $to);
        }

        return $this->groupByCheckId();
    }
    private function groupByCheckId() {
        $results = [];

        foreach ($this->history as $server => $data) {
            $results[$server] = [];
            foreach ($data as $key => $record) {


                $record['ts'] = strtotime($record['date']);

                if (!isset($results[$server][$record['check_id']])) {
                    $results[$server][$record['check_id']] = [];
                }

                $results[$server][$record['check_id']][$key] = $record;
            }
        }

        $this->history = $results;
    }
}