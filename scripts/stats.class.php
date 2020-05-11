<?php

class stats
{
    private $history = [];
    private $results = [];
    private $calendar;
    private $timeZone;
    private $usersShifts = [];
    private $summaryReportName = 'Summary report';
    private $nobodysReportName = 'Nobody\'s shift';

    function __construct()
    {
        global $serversList;
        global $timeZone;

        $this->db          = new db;
        $this->serversList = $serversList;
        $this->usersList   = $this->db->usersListStatsPage();
        $this->server      = (isset($_GET['server']) && $_GET['server']) ? $_GET['server'] : '';
        $this->list        = (isset($_GET['list'])   && $_GET['list'])   ? $_GET['list']   : '';
        $this->servers     = $this->setServers($this->server, $this->serversList);
        $this->timeZone    = $timeZone;
        $this->calendar    = new calendar;
        $this->usersAlerts = [$this->summaryReportName => []];
    }

    public function returnTabsList()
    {
        $servers = array_keys($this->serversList);
        sort($servers);
        $servers = implode(',', $servers);

        $users = $this->calendar->usersList;
        array_unshift($users, $this->summaryReportName, $this->nobodysReportName);

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
            'timeZone'        => $this->timeZone,
        ];
    }

    public function returnStats()
    {
        $this->setFormattedDates();
        $this->validate();
        $this->runCalendar();
        $this->getStats();
        $this->calculateAllData();
        $this->setAverages();
        $this->setAdditionalInfo();

        return $this->results;
    }

    private function setAdditionalInfo()
    {
        foreach ($this->results as $name => $data) {
            if ($name != $this->summaryReportName) {
                continue;
            }

            $additional = [];

            foreach ($data as $server => $serverData) {
                if ($server == 'All') {
                    continue;
                }

                if (!isset($additional[$server])) {
                    $additional[$server] = [];
                }

                if (isset($this->serversList[$server]) && isset($this->serversList[$server]['stats'])) {
                    foreach ($this->serversList[$server]['stats'] as $commandName => $command) {
                        $command = str_replace('__from__', date('Y-m-d', $this->from), $command);
                        $command = str_replace('__to__', date('Y-m-d', $this->to + 1), $command);

                        $return = 0;
                        exec($command . " 2>&1", $return);

                        $additional[$server][$commandName] = intval($return[0]);
                    }
                }
            }
        }

        $all = [];
        foreach ($additional as $server => $data) {
            if ($server != 'All') {
                $this->results[$this->summaryReportName][$server]['additional'] = $data;

                foreach ($data as $name => $value) {
                    if (!isset($all[$name])) {
                        $all[$name] = $value;
                    } else {
                        $all[$name] += $value;
                    }
                }
            }
        }

        $this->results[$this->summaryReportName]['All']['additional'] = $all;
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
        $this->results[$this->summaryReportName] = $this->calculateByServer($this->from, $this->to, $this->summaryReportName, [], $this->history, true);
        $this->getStatsByUser();
        $this->addUsersAlerts();
    }
    private function addUsersAlerts()
    {
        foreach ($this->usersAlerts[$this->summaryReportName] as $server => $serverData) {
            foreach ($serverData as $name => $nameData) {
                if ($name != $this->summaryReportName) {
                    if (!isset($this->results[$name]) ) {
                        $this->results[$name] = [];
                    }

                    if (!isset($this->results[$name][$server]) ) {
                        $this->results[$name][$server] = [
                            'alerts_count'     => 0,
                            'warning_count'    => 0,
                            'critical_count'   => 0,
                            'unknown_count'    => 0,
                            'info_count'       => 0,
                            'emergency_count'  => 0,
                            'unhandled_time'   => 0,
                            'quick_acked_time' => 0,
                            'reaction_time'    => 0,
                            'reaction_alerts'  => 0,
                            'worked_total'     => 0,
                            'worked_on_shift'  => 0,
                            'worked_total_list'    => [],
                            'worked_on_shift_list' => [],
                        ];
                    }
                }
            }
        }
        foreach ($this->results as $name => $data) {
            foreach ($data as $server => $item) {
                if ($name == $this->summaryReportName) {
                    if (isset($this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName])) {
                        $this->results[$name][$server]['worked_total']         = count($this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName]);
                        $this->results[$name][$server]['worked_on_shift']      = count($this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName]);
                        $this->results[$name][$server]['worked_on_shift_list'] = $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName];
                        $this->results[$name][$server]['worked_total_list']    = $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName];
                    }
                } else {
                    if (isset($this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName])) {
                        $this->results[$name][$server]['worked_total']      = count($this->usersAlerts[$this->summaryReportName][$server][$name]);
                        $this->results[$name][$server]['worked_total_list'] = $this->usersAlerts[$this->summaryReportName][$server][$name];
                    }

                    if (isset($this->usersAlerts[$name][$server])) {
                        $this->results[$name][$server]['worked_on_shift']      = count($this->usersAlerts[$name][$server]);
                        $this->results[$name][$server]['worked_on_shift_list'] = $this->usersAlerts[$name][$server];
                    }
                }
            }
        }
    }
    private function calculateByServer($from, $to, $user, $stats, $alertsList, $saveUsersData = false)
    {
        if (!isset($stats[$user])) {
            $stats[$user] = [];
        }

        foreach ($alertsList as $server => $data) {
            if (!isset($stats[$user][$server])) {
                $stats[$user][$server] = [
                    'alerts_count'     => 0,
                    'warning_count'    => 0,
                    'critical_count'   => 0,
                    'unknown_count'    => 0,
                    'info_count'       => 0,
                    'emergency_count'  => 0,
                    'unhandled_time'   => 0,
                    'quick_acked_time' => 0,
                    'reaction_time'    => 0,
                    'reaction_alerts'  => 0,
                    'worked_total'     => 0,
                    'worked_on_shift'  => 0,
                    'worked_total_list'    => [],
                    'worked_on_shift_list' => [],
                ];
            }

            foreach ($data as $check_id => $dataList) {
                $alerts    = [];
                $lastAlert = null;

                foreach ($dataList as $key => $record) {
                    $ts = $record['ts'];

                    if ($saveUsersData) {
                        $this->findUser($ts, $server, $check_id, $record, $lastAlert);
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

                if (count($alerts) == 1 && isset($alerts[0]) && isset($alerts[0]['state']) && $alerts[0]['state'] == 'ok') {
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

                $stats[$user][$server] = $this->calculateByCheckId($stats[$user][$server], $alerts, $from, $to, $server, $saveUsersData, $user);
            }
        }

        return $stats[$user];
    }
    private function findUser($ts, $server, $check_id, $record, $lastAlert)
    {
        $found = 0;
        foreach ($this->usersShifts as $user => $dates) {
            foreach ($dates as $key => $date) {
                if ($ts >= $date['start'] && $ts <= $date['finish']) {
                    if (!isset($this->usersShifts[$user][$key]['alerts'])) {
                        $this->usersShifts[$user][$key]['alerts'] = [];
                    }

                    if (!isset($this->usersShifts[$user][$key]['alerts'][$server])) {
                        $this->usersShifts[$user][$key]['alerts'][$server] = [];
                    }

                    if (!isset($this->usersShifts[$user][$key]['alerts'][$server][$check_id])) {
                        $this->usersShifts[$user][$key]['alerts'][$server][$check_id] = [];
                    }

                    if ($lastAlert && !$this->usersShifts[$user][$key]['alerts'][$server][$check_id]) {
                        $this->usersShifts[$user][$key]['alerts'][$server][$check_id][] = $lastAlert;
                    }

                    $this->usersShifts[$user][$key]['alerts'][$server][$check_id][] = $record;
                    $found++;

                    break 2;
                }
            }
        }
    }
    private function getStatsByUser()
    {
        $stats = [];

        foreach ($this->usersShifts as $user => $dates) {
            $stats[$user] = [];

            foreach ($dates as $key => $date) {
                if (isset($this->usersShifts[$user][$key]['alerts']) && $this->usersShifts[$user][$key]['alerts']) {
                    $stats[$user] = $this->calculateByServer($date['start'], $date['finish'], $user, $stats, $this->usersShifts[$user][$key]['alerts'], false);
                }
            }

            $this->results[$user] = $stats[$user];
        }
    }
    private function getUserFullName($name, $server) {
        if (isset($this->usersList[$server]) && isset($this->usersList[$server][$name])) {
            return $this->usersList[$server][$name];
        }

        return '';
    }
    private function setUsersAlerts($server, $saveUsersData, $alert, $user)
    {
        if (!$saveUsersData) {
            if ($alert['user']) {
                if ($user == $this->nobodysReportName) {
                    $full_name = $user;
                } else {
                    $full_name = $this->getUserFullName($alert['user'], $server);
                }

                if ($user == $full_name) {
                    if (!isset($this->usersAlerts[$full_name])) {
                        $this->usersAlerts[$full_name] = [];
                    }

                    if (!isset($this->usersAlerts[$full_name][$server])) {
                        $this->usersAlerts[$full_name][$server] = [];
                    }

                    if (!isset($this->usersAlerts[$full_name][$server][$alert['check_id']])) {
                        $this->usersAlerts[$full_name][$server][$alert['check_id']] = [
                            'host'    => $alert['host'],
                            'service' => $alert['service'],
                            'comment' => [],
                        ];
                    }

                    if ($alert['comment'] && !in_array($alert['comment'], $this->usersAlerts[$full_name][$server][$alert['check_id']]['comment'])) {
                        $this->usersAlerts[$full_name][$server][$alert['check_id']]['comment'][] = $alert['comment'];
                    }
                }
            }

            return;
        }

        if (!isset($this->usersAlerts[$this->summaryReportName])) {
            $this->usersAlerts[$this->summaryReportName] = [];
        }

        if (!isset($this->usersAlerts[$this->summaryReportName][$server])) {
            $this->usersAlerts[$this->summaryReportName][$server] = [$this->summaryReportName => []];
        }

        if (!isset($this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']])) {
            $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']] = [
                'host'    => $alert['host'],
                'service' => $alert['service'],
                'comment' => [],
            ];
        }

        if ($alert['comment'] && !in_array($alert['comment'], $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['comment'])) {
            $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['comment'][] = $alert['comment'];
        }

        if ($alert['user']) {
            $full_name = $this->getUserFullName($alert['user'], $server);

            if (!isset($this->usersAlerts[$this->summaryReportName][$server][$full_name])) {
                $this->usersAlerts[$this->summaryReportName][$server][$full_name] = [];
            }

            if (!isset($this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']])) {
                $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']] = [
                    'host'    => $alert['host'],
                    'service' => $alert['service'],
                    'comment' => [],
                ];
            }

            if ($alert['comment'] && !in_array($alert['comment'], $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['comment'])) {
                $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['comment'][] = $alert['comment'];
            }
        }
    }
    private function calculateByCheckId($stats, $alerts, $from, $to, $server, $saveUsersData, $user)
    {
        $lastTs          = null;
        $lastQuickAckTs  = null;
        $quickAckStarted = null;
        $alertStarted    = null;
        $alertStates     = [];
        $emergencyAlert  = 0;

        foreach ($alerts as $alert) {
            $ts       = $alert['ts'];
            $ts       = ($ts > $to)   ? $to   : $ts;
            $ts       = ($ts < $from) ? $from : $ts;
            $severity = $alert['severity'];
            $state    = $alert['state'];

            if ($alert['info']) {
                if (in_array($state, ['warning', 'critical', 'unknown'])) {
                    $stats['info_count']++;

                    return $stats;
                }

                continue;
            }

            if ($alertStarted && !$emergencyAlert && strpos($alert['host'] . " " . $alert['service'] . " " . $alert['output'], 'EMERGENCY') !== false) {
                $stats['emergency_count']++;
                $emergencyAlert++;
            }


            if ($severity == 'unhandled' && $state != 'ok') {
                $this->setUsersAlerts($server, $saveUsersData, $alert, $user);
                $alertStarted = true;
                $lastTs = $ts;
                if (in_array($state, ['warning', 'critical', 'unknown'])) {
                    $alertStates[] = $state;
                }
            }

            if ($severity == 'quick_acked' && !$alertStarted) {
                $this->setUsersAlerts($server, $saveUsersData, $alert, $user);
                $alertStarted = true;
                $lastTs = $ts;
                $lastQuickAckTs = $ts;
                $quickAckStarted = true;
                if (in_array($state, ['warning', 'critical', 'unknown'])) {
                    $alertStates[] = $state;
                }
            }

            if ($severity == 'quick_acked') {
                $this->setUsersAlerts($server, $saveUsersData, $alert, $user);
                if ($alertStarted) {
                    $alertStarted = false;
                    $stats['reaction_time'] += ($ts - $lastTs);
                    $stats['reaction_alerts']++;
                }

                $lastQuickAckTs = $ts;
                $quickAckStarted = true;
            }

            if ((in_array($severity, ['acked', 'sched', 'planned_downtime']) || $state == 'ok') && $lastTs) {
                $this->setUsersAlerts($server, $saveUsersData, $alert, $user);
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

        $alertStates = array_unique($alertStates);
        $stats['alerts_count'] += count($alertStates);

        if (in_array('warning', $alertStates)) {
            $stats['warning_count'] ++;
        }

        if (in_array('critical', $alertStates)) {
            $stats['critical_count'] ++;
        }

        if (in_array('unknown', $alertStates)) {
            $stats['unknown_count'] ++;
        }

        return $stats;
    }
    private function calculateAllData()
    {
        foreach ($this->results as $name => $stats) {
            $result = [
                'alerts_count'     => 0,
                'warning_count'    => 0,
                'critical_count'   => 0,
                'unknown_count'    => 0,
                'info_count'       => 0,
                'emergency_count'  => 0,
                'unhandled_time'   => 0,
                'quick_acked_time' => 0,
                'reaction_time'    => 0,
                'reaction_alerts'  => 0,
                'worked_total'     => 0,
                'worked_on_shift'  => 0,
                'worked_total_list'    => [],
                'worked_on_shift_list' => [],
            ];

            foreach ($stats as $server => $stat) {
                $result['alerts_count']     += $stat['alerts_count'];
                $result['warning_count']    += $stat['warning_count'];
                $result['critical_count']   += $stat['critical_count'];
                $result['unknown_count']    += $stat['unknown_count'];
                $result['info_count']       += $stat['info_count'];
                $result['unhandled_time']   += $stat['unhandled_time'];
                $result['quick_acked_time'] += $stat['quick_acked_time'];
                $result['reaction_time']    += $stat['reaction_time'];
                $result['reaction_alerts']  += $stat['reaction_alerts'];
                $result['emergency_count']  += $stat['emergency_count'];

                foreach ($stat['worked_total_list'] as $check_id => $alert) {
                    if (!isset($result['worked_total_list'][$check_id])) {
                        $result['worked_total_list'][$check_id] = $alert;
                    }
                }

                foreach ($stat['worked_on_shift_list'] as $check_id => $alert) {
                    if (!isset($result['worked_on_shift_list'][$check_id])) {
                        $result['worked_on_shift_list'][$check_id] = $alert;
                    }
                }
            }

            $result['worked_total']    = count($result['worked_total_list']);
            $result['worked_on_shift'] = count($result['worked_on_shift_list']);

            $this->results[$name]['All'] = $result;
        }
    }
    private function runCalendar()
    {
        $this->calendar->setTime($this->from, $this->to);
        $this->usersShifts = $this->calendar->getEvents();

        if (!isset($this->usersShifts[$this->nobodysReportName])) {
            $this->usersShifts[$this->nobodysReportName] = [
                0 => [
                    'start'  => $this->from,
                    'finish' => $this->to,
                ]
            ];
        }

        foreach ($this->usersShifts as $name => $shifts) {
            if ($name == $this->nobodysReportName) {
                continue;
            }
            foreach ($shifts as $shift) {
                foreach ($this->usersShifts[$this->nobodysReportName] as $key => $item) {

                    if ($item['start'] <= $shift['start'] && $item['finish'] >= $shift['finish']) {
                        unset($this->usersShifts[$this->nobodysReportName][$key]);

                        if ($item['start'] != $shift['start']) {
                            $this->usersShifts[$this->nobodysReportName][] = [
                                'start'  => $item['start'],
                                'finish' => $shift['start'],
                            ];
                        }

                        if ($item['finish'] != $shift['finish']) {
                            $this->usersShifts[$this->nobodysReportName][] = [
                                'start'  => $shift['finish'],
                                'finish' => $item['finish'],
                            ];
                        }

                        break;
                    }
                }
            }
        }
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
    private function setFormattedDates()
    {
        $this->from = $this->getTs('from');
        $this->to   = $this->getTs('to');

        if (time() < $this->to) {
            $this->to = time();
        }
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
        $from = $this->returnDateForDb($this->from);
        $to   = $this->returnDateForDb($this->to);
        $this->history = $this->db->historyGetUnfinishedAlertsWithPeriod($from, $to);

        $this->groupByCheckId();
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

        $this->clearList();
    }

    private function clearList() {
        $results = [];
        foreach ($this->history as $server => $checks) {
            foreach ($checks as $check_id => $check) {
                $cleared = $this->clearShortFlappings($check);
                $cleared = $this->clearAckedSckedFlappings($cleared);
                $cleared = $this->clearPlannedAlerts($cleared);
                $cleared = $this->clearOkAlerts($cleared);
                
                if ($cleared) {
                    $results[$server][$check_id] = $cleared;
                }
            }
        }

        $this->history = $results;
    }
    private function clearShortFlappings($check)
    {
        $results = [];
        $last = [
            'key'      => 0,
            'severity' => '',
            'state'    => '',
            'time'     => 0,
        ];
        foreach ($check as $key => $item) {
            $results[$key] = $item;

            if ($item['state'] == 'ok' && $last['severity'] == 'unhandled' && $last['state'] != 'ok' && ($item['ts'] - $last['time']) < 70) {
                if (isset($results[$last['key']])) {
                    unset($results[$last['key']]);
                }
                if (isset($results[$key])) {
                    unset($results[$key]);
                }
            }

            $last = [
                'key'      => $key,
                'severity' => $item['severity'],
                'state'    => $item['state'],
                'time'     => $item['ts'],
            ];
        }

        return $results;
    }
    private function clearAckedSckedFlappings($check)
    {
        $results = [];

        $last = [
            'key'      => 0,
            'severity' => '',
            'state'    => '',
            'time'     => 0,
            'comment'  => '',
        ];
        foreach ($check as $key => $item) {
            $results[$key] = $item;

            if (in_array($item['severity'], ['acked', 'sched']) && $item['comment'] != 'temp' && $last['severity'] == 'unhandled' && $last['state'] != 'ok' && ($item['ts'] - $last['time']) < 70) {
                if (isset($results[$last['key']])) {
                    unset($results[$last['key']]);
                }
                if (isset($results[$key])) {
                    unset($results[$key]);
                }
            }

            $last = [
                'key'      => $key,
                'severity' => $item['severity'],
                'state'    => $item['state'],
                'time'     => $item['ts'],
                'comment'  => $item['comment'],
            ];
        }


        return $results;
    }
    private function clearPlannedAlerts($check)
    {
        $results = [];

        $last = [
            'key'      => 0,
            'severity' => '',
            'state'    => '',
            'time'     => 0,
        ];
        foreach ($check as $key => $item) {
            $results[$key] = $item;

            if ($item['severity'] == 'planned_downtime' && $last['severity'] == 'unhandled' && $last['state'] != 'ok' && ($item['ts'] - $last['time']) < 70) {
                if (isset($results[$last['key']])) {
                    unset($results[$last['key']]);
                }
                if (isset($results[$key])) {
                    unset($results[$key]);
                }
            }

            $last = [
                'key'      => $key,
                'severity' => $item['severity'],
                'state'    => $item['state'],
                'time'     => $item['ts'],
            ];
        }


        return $results;
    }
    private function clearOkAlerts($check)
    {
        $results = [];

        $last = [
            'state' => '',
            'key'   => 0,
        ];
        foreach ($check as $key => $item) {
            $results[$key] = $item;

            if ($item['state'] == 'ok' && $last['state'] == 'ok') {
                if (isset($results[$key])) {
                    unset($results[$key]);
                }
            }

            $last = [
                'state' => $item['state'],
                'key'   => $key,
            ];
        }

        if (count($results) == 1 && $results[array_keys($results)[0]]['state'] == 'ok') {
            $results = [];
        }

        return $results;
    }
}
