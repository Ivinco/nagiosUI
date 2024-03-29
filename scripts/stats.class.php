<?php

class stats
{
    private $history = [];
    private $results = [];
    private $calendar;
    private $timeZone;
    private $usersShifts = [];
    private $emergencies = [];
    private $emergenciesList = [];
    private $summaryReportName = 'Summary report';
    private $nobodysReportName = 'Nobody\'s shift';
    private $calendarTZ = 'UTC';

    const BROWSER_TYPE_NAME = 'Browser';

    function __construct($lastYear = false)
    {
        global $serversList;
        global $timeZone;
        global $db;
        
        $this->db          = $db;
        $this->utils       = new utils();
        $this->serversList = $serversList;
        $this->server      = (isset($_GET['server']) && $_GET['server']) ? $_GET['server'] : '';
        $this->list        = (isset($_GET['list'])   && $_GET['list'])   ? $_GET['list']   : '';
        $this->servers     = $this->setServers($this->server, $this->serversList);
        $this->timeZone    = $timeZone;
        $this->lastYear    = $lastYear;
        $this->usersAlerts = [$this->summaryReportName => []];

        $this->setUsersList();

        if (!$this->lastYear) {
            $this->calendar = new calendar;
        }
    }

    public function saveHandled()
    {
        $text = (isset($_GET['comment']) && $_GET['comment']) ? $_GET['comment'] : '';
        $text = urldecode($text);
        $text = str_replace(["\r\n", "\r", "\n"], "<br />", $text);

        $user = (isset($_GET['user']) && $_GET['user']) ? $_GET['user'] : '';
        $user = urldecode($user);
        $user = trim($user);

        $text = $user . ": " . $text;

        $idList = (isset($_GET['ids_list']) && $_GET['ids_list']) ? $_GET['ids_list'] : '';
        $idList = urldecode($idList);
        $idList = explode('|||', $idList);

        $error = $this->db->saveHandledToHistory($text, $idList);

        return [
            'text'     => $text,
            'ids_list' => $idList,
            'error'    => $error,
        ];
    }

    private function setUsersList()
    {
        $this->usersList = $this->db->usersListStatsPage();

        foreach ($this->usersList as $server => $data) {
            if (!$server || !array_key_exists($server, $this->serversList)) {
                unset($this->usersList[$server]);
            }
        }
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
            'timeZone'       => $this->timeZone,
            'timeZonesList'  => $this->utils->getTimeZonesList(),
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

    public function returnLastYearStats()
    {
        $this->history = [];

        $this->setFormattedDates();
        $this->validate();
        $this->getStatsDataFromDb();
        $this->results[$this->summaryReportName] = $this->calculateByServer($this->from, $this->to, $this->summaryReportName, [], $this->history, false);
        $this->calculateAllData();

        $results = [];

        foreach ($this->results as $records) {
            foreach ($records as $server => $record) {
                $results[$server] = [
                    "unhandled_time"   => (isset($record["unhandled_time"]))   ? $record["unhandled_time"]   : 0,
                    "quick_acked_time" => (isset($record["quick_acked_time"])) ? $record["quick_acked_time"] : 0,
                ];
            }
        }

        return $results;
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

    private function getLastOutput($date, $output)
    {
        $dates  = $date . "|||";
        $dates .= $this->utils->returnDateFromDbToRequest($date, 'Y-m-d H:i:s');

        return $dates . "|||" . $output;
    }
    private function getLastHandled($date, $handled)
    {
        return $this->getLastOutput($date, $handled);
    }

    private function getStats()
    {
        $this->history = [];
        $this->getStatsDataFromDb();
        $this->results[$this->summaryReportName] = $this->calculateByServer($this->from, $this->to, $this->summaryReportName, [], $this->history, true);
        $this->getStatsByUser();
        $this->addUsersAlerts();
        $this->calculateNoShiftDuration();
    }
    private function calculateNoShiftDuration()
    {
        foreach ($this->usersShifts as $user => $shifts) {
            foreach ($shifts as $shift) {
                if (isset($shift['alerts']) && $shift['alerts']) {
                    foreach ($shift['alerts'] as $server => $alerts) {
                        foreach ($alerts as $check_id => $list) {
                            $this->calculateNoShiftDurationByCheckId($user, $server, $check_id, $list, $shift['start'], $shift['finish']);
                        }
                    }
                }
            }
        }
    }
    private function calculateNoShiftDurationByCheckId($shiftUser, $server, $check_id = 0, $alerts = [], $from, $to)
    {
        $duration        = 0;
        $durationLong    = 0;
        $quickAckStartTs = 0;
        $quickAckStarted = false;
        $user            = '';
        $alertStates     = [];
        $alertStatesLong = [];
        $lastAlertState  = '';
        $alert           = [];
        $lastComment     = '';
        $lastOutput      = '';
        $lastHandled     = '';

        foreach ($alerts as $alert) {
            $ts       = $alert['ts'];
            $ts       = ($ts > $to)   ? $to   : $ts;
            $ts       = ($ts < $from) ? $from : $ts;
            $severity = $alert['severity'];
            $state    = $alert['state'];

            if ($severity === 'quick_acked' && !$quickAckStarted) {
                $user = $this->getUserFullName($alert['user'], $server);

                if ($shiftUser === $user) {
                    $user = '';
                    continue;
                }

                if (in_array($state, ['warning', 'critical', 'unknown'])) {
                    $lastAlertState = $state;
                }

                $lastComment     = 'temp';
                $lastOutput      = $this->getLastOutput($alert['date'], $alert['output']);
                $lastHandled     = $this->getLastOutput($alert['date'], $alert['handled']);
                $quickAckStarted = true;
                $quickAckStartTs = $ts;

                continue;
            }

            if ($quickAckStarted && in_array($severity, ['acked', 'sched', 'unhandled', 'planned_downtime'])) {
                $diff = $ts - $quickAckStartTs;

                if ($diff >= 300) {
                    $alertStatesLong[] = $lastAlertState;
                    $durationLong += $diff;
                    $this->calculateNoShiftSetUsersAlerts($server, $alert, $user, true, $lastComment, $lastOutput, $lastHandled);
                } else {
                    $alertStates[] = $lastAlertState;
                    $duration += $diff;
                    $this->calculateNoShiftSetUsersAlerts($server, $alert, $user, false, $lastComment, $lastOutput, $lastHandled);
                }

                $lastComment     = '';
                $lastOutput      = '';
                $lastHandled     = '';
                $quickAckStarted = false;
                $quickAckStartTs = 0;
            }
        }

        if ($quickAckStarted) {
            $diff = $to - $quickAckStartTs;

            if ($diff >= 300) {
                $alertStatesLong[] = $lastAlertState;
                $durationLong += $diff;
                $this->calculateNoShiftSetUsersAlerts($server, $alert, $user, true, $lastComment, $lastOutput, $lastHandled);
            } else {
                $alertStates[] = $lastAlertState;
                $duration += $diff;
                $this->calculateNoShiftSetUsersAlerts($server, $alert, $user, false, $lastComment, $lastOutput, $lastHandled);
            }
        }

        if (!$user || (!$duration && !$durationLong)) {
            return;
        }

        if ($duration) {
            $this->results[$user][$server]['worked_no_shift']['quick_acked_time'] += $duration;

            if (!in_array($check_id, $this->results[$user][$server]['worked_no_shift']['check_ids'])) {
                $this->results[$user][$server]['worked_no_shift']['check_ids'][] = $check_id;
            }

            $this->calculateNoShiftAlertsCount($user, $server, $alertStates, false);
        }

        if ($durationLong) {
            $this->results[$user][$server]['long']['worked_no_shift']['quick_acked_time'] += $durationLong;

            if (!in_array($check_id, $this->results[$user][$server]['long']['worked_no_shift']['check_ids'])) {
                $this->results[$user][$server]['long']['worked_no_shift']['check_ids'][] = $check_id;
            }

            $this->calculateNoShiftAlertsCount($user, $server, $alertStatesLong, true);
        }
    }
    private function calculateNoShiftAlertsCount($user, $server, $states, $isLong = false)
    {
        $states = array_unique($states);

        if (in_array('warning', $states)) {
            if ($isLong) {
                $this->results[$user][$server]['long']['worked_no_shift']['warning_count']++;
            } else {
                $this->results[$user][$server]['worked_no_shift']['warning_count']++;
            }
        }

        if (in_array('critical', $states)) {
            if ($isLong) {
                $this->results[$user][$server]['long']['worked_no_shift']['critical_count']++;
            } else {
                $this->results[$user][$server]['worked_no_shift']['critical_count']++;
            }
        }

        if (in_array('unknown', $states)) {
            if ($isLong) {
                $this->results[$user][$server]['long']['worked_no_shift']['unknown_count']++;
            } else {
                $this->results[$user][$server]['worked_no_shift']['unknown_count']++;
            }
        }
    }
    private function calculateNoShiftSetUsersAlerts($server, $alert, $user, $long = false, $lastComment, $lastOutput, $lastHandled)
    {
        $comment = ($alert['comment']) ? $alert['comment'] : $lastComment;

        if ($long) {
            if (!isset($this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']])) {
                $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
            }

            $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($comment, $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['comment']);

            $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['output'] = $this->returnCommentOrOutput($lastOutput, $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['output']);

            $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['date'], $alert['output']), $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['output']);

            $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($lastHandled, $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['handled']);

            $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['date'], $alert['handled']), $this->results[$user][$server]['long']['worked_no_shift']['list'][$alert['check_id']]['handled']);

        } else {
            if (!isset($this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']])) {
                $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
            }

            $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($comment, $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['comment']);

            $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['output'] = $this->returnCommentOrOutput($lastOutput, $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['output']);

            $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['date'], $alert['output']), $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['output']);

            $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($lastHandled, $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['handled']);

            $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['date'], $alert['handled']), $this->results[$user][$server]['worked_no_shift']['list'][$alert['check_id']]['handled']);
        }
    }
    private function addUsersAlerts()
    {
        foreach ($this->usersAlerts[$this->summaryReportName] as $server => $serverData) {
            foreach ($serverData as $name => $nameData) {
                if ($name != $this->summaryReportName && $name != 'long') {
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
                            'emergency_calls'  => 0,
                            'unhandled_time'   => 0,
                            'quick_acked_time' => 0,
                            'reaction_time'    => 0,
                            'reaction_alerts'  => 0,
                            'worked_total'     => 0,
                            'worked_on_shift'  => 0,
                            'worked_total_list'    => [],
                            'worked_on_shift_list' => [],
                            'worked_no_shift'  => [
                                'quick_acked_time' => 0,
                                'check_ids'        => [],
                                'warning_count'    => 0,
                                'critical_count'   => 0,
                                'unknown_count'    => 0,
                                'info_count'       => 0,
                                'emergency_count'  => 0,
                                'list'             => [],
                            ],
                        ];

                        $this->results[$name][$server]['long'] = $this->results[$name][$server];
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

                    if (isset($this->usersAlerts[$this->summaryReportName][$server]['long'])) {
                        $this->results[$name][$server]['long']['worked_total']         = count($this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName]);
                        $this->results[$name][$server]['long']['worked_on_shift']      = count($this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName]);
                        $this->results[$name][$server]['long']['worked_on_shift_list'] = $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName];
                        $this->results[$name][$server]['long']['worked_total_list']    = $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName];
                    }
                } else {
                    if (isset($this->usersAlerts[$this->summaryReportName][$server][$name])) {
                        $this->results[$name][$server]['worked_total']      = count($this->usersAlerts[$this->summaryReportName][$server][$name]);
                        $this->results[$name][$server]['worked_total_list'] = $this->usersAlerts[$this->summaryReportName][$server][$name];
                    }

                    if (isset($this->usersAlerts[$this->summaryReportName][$server][$name]['long'])) {
                        $this->results[$name][$server]['long']['worked_total']      = count($this->usersAlerts[$this->summaryReportName][$server][$name]['long']);
                        $this->results[$name][$server]['long']['worked_total_list'] = $this->usersAlerts[$this->summaryReportName][$server][$name]['long'];
                    }

                    if (isset($this->usersAlerts[$name][$server])) {
                        $this->results[$name][$server]['worked_on_shift']      = count($this->usersAlerts[$name][$server]);
                        $this->results[$name][$server]['worked_on_shift_list'] = $this->usersAlerts[$name][$server];
                    }

                    if (isset($this->usersAlerts[$name][$server]['long'])) {
                        $this->results[$name][$server]['long']['worked_on_shift']      = count($this->usersAlerts[$name][$server]['long']);
                        $this->results[$name][$server]['long']['worked_on_shift_list'] = $this->usersAlerts[$name][$server]['long'];
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
                    'emergency_calls'  => 0,
                    'unhandled_time'   => 0,
                    'quick_acked_time' => 0,
                    'reaction_time'    => 0,
                    'reaction_alerts'  => 0,
                    'worked_total'     => 0,
                    'worked_on_shift'  => 0,
                    'worked_total_list'    => [],
                    'worked_on_shift_list' => [],
                    'worked_no_shift'  => [
                        'quick_acked_time' => 0,
                        'check_ids'        => [],
                        'warning_count'    => 0,
                        'critical_count'   => 0,
                        'unknown_count'    => 0,
                        'info_count'       => 0,
                        'emergency_count'  => 0,
                        'list'             => [],
                    ],
                ];

                $stats[$user][$server]['long'] = $stats[$user][$server];
            }

            $stats[$user][$server]['emergency_count'] += $this->getEmergencyCount($from, $to);
            $stats[$user][$server]['emergency_calls'] += $this->getEmergencyCalls($from, $to);

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
    private function setDefaultsForUsersAlerts($full_name, $server, $user_name = null, $summary = false)
    {
        if (!isset($this->usersAlerts[$full_name])) {
            $this->usersAlerts[$full_name] = [];
        }

        if (!isset($this->usersAlerts[$full_name][$server])) {
            $this->usersAlerts[$full_name][$server] = [];

            if ($summary) {
                $this->usersAlerts[$full_name][$server][$user_name] = [];
            }
        }
    }
    private function returnDefaultArrayForUsersAlerts($host, $service)
    {
        return [
            'host'    => $host,
            'service' => $service,
            'comment' => [],
            'output'  => [],
            'handled' => [],
        ];
    }
    private function returnCommentOrOutput($item, $array)
    {
        if ($item && !in_array($item, $array)) {
            $array[] = $item;
        }

        return $array;
    }
    private function setUsersAlerts($server, $saveUsersData, $alert, $user, $long = false)
    {
        if (!$saveUsersData) {
            if ($alert['user']) {
                if ($user == $this->nobodysReportName) {
                    $full_name = $user;
                } else {
                    $full_name = $this->getUserFullName($alert['user'], $server);
                }

                if ($user == $full_name) {
                    $this->setDefaultsForUsersAlerts($full_name, $server);

                    if (!isset($this->usersAlerts[$full_name][$server]['long'])) {
                        $this->usersAlerts[$full_name][$server]['long'] = [];
                    }

                    if ($long) {
                        if (!isset($this->usersAlerts[$full_name][$server]['long'][$alert['check_id']])) {
                            $this->usersAlerts[$full_name][$server]['long'][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
                        }

                        $this->usersAlerts[$full_name][$server]['long'][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($alert['comment'], $this->usersAlerts[$full_name][$server]['long'][$alert['check_id']]['comment']);

                        $this->usersAlerts[$full_name][$server]['long'][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['original_date'], $alert['output']), $this->usersAlerts[$full_name][$server]['long'][$alert['check_id']]['output']);

                        $this->usersAlerts[$full_name][$server]['long'][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['original_date'], $alert['handled']), $this->usersAlerts[$full_name][$server]['long'][$alert['check_id']]['handled']);
                    } else {
                        if (!isset($this->usersAlerts[$full_name][$server][$alert['check_id']])) {
                            $this->usersAlerts[$full_name][$server][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
                        }

                        $this->usersAlerts[$full_name][$server][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($alert['comment'], $this->usersAlerts[$full_name][$server][$alert['check_id']]['comment']);

                        $this->usersAlerts[$full_name][$server][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['original_date'], $alert['output']), $this->usersAlerts[$full_name][$server][$alert['check_id']]['output']);

                        $this->usersAlerts[$full_name][$server][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['original_date'], $alert['handled']), $this->usersAlerts[$full_name][$server][$alert['check_id']]['handled']);
                    }
                }
            }

            return;
        }

        $this->setDefaultsForUsersAlerts($this->summaryReportName, $server, $this->summaryReportName, true);


        if (!isset($this->usersAlerts[$this->summaryReportName][$server]['long'])) {
            $this->usersAlerts[$this->summaryReportName][$server]['long'] = [$this->summaryReportName => []];
        }

        if ($long) {
            if (!isset($this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']])) {
                $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
            }

            $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($alert['comment'], $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']]['comment']);

            $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['original_date'], $alert['output']), $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']]['output']);

            $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['original_date'], $alert['handled']), $this->usersAlerts[$this->summaryReportName][$server]['long'][$this->summaryReportName][$alert['check_id']]['handled']);

        } else {
            if (!isset($this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']])) {
                $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
            }

            $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($alert['comment'], $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['comment']);

            $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['original_date'], $alert['output']), $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['output']);

            $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['original_date'], $alert['handled']), $this->usersAlerts[$this->summaryReportName][$server][$this->summaryReportName][$alert['check_id']]['handled']);
        }

        if ($alert['user']) {
            $full_name = $this->getUserFullName($alert['user'], $server);

            if (!isset($this->usersAlerts[$this->summaryReportName][$server][$full_name])) {
                $this->usersAlerts[$this->summaryReportName][$server][$full_name] = [];
            }

            if (!isset($this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'])) {
                $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'] = [];
            }

            if ($long) {
                if (!isset($this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']])) {
                    $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
                }

                $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($alert['comment'], $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']]['comment']);

                $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['original_date'], $alert['output']), $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']]['output']);
                $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['original_date'], $alert['handled']), $this->usersAlerts[$this->summaryReportName][$server][$full_name]['long'][$alert['check_id']]['handled']);

            } else {
                if (!isset($this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']])) {
                    $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']] = $this->returnDefaultArrayForUsersAlerts($alert['host'], $alert['service']);
                }

                $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['comment'] = $this->returnCommentOrOutput($alert['comment'], $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['comment']);

                $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['output'] = $this->returnCommentOrOutput($this->getLastOutput($alert['original_date'], $alert['output']), $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['output']);

                $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['handled'] = $this->returnCommentOrOutput($this->getLastHandled($alert['original_date'], $alert['handled']), $this->usersAlerts[$this->summaryReportName][$server][$full_name][$alert['check_id']]['handled']);
            }
        }
    }
    private function getEmergencyTs($requestDate, $format = 'Y-m-d H:i:s')
    {
        $tz = $this->utils->timeCorrectionType;

        if (!$tz || strtolower($tz) === strtolower(self::BROWSER_TYPE_NAME)) {
            $tz = 'UTC';
        }

        $date = DateTime::createFromFormat($format, $requestDate, new DateTimeZone($tz));
        $date->setTimeZone(new DateTimeZone($this->timeZone));

        return $date->getTimestamp();
    }
    private function getEmergencyCount($from, $to)
    {
        $emergencies = 0;

        foreach ($this->emergenciesList as $emergency) {
            $date = $this->getEmergencyTs($emergency['logged']);

            if ($date >= $from && $date <= $to) {
                $emergencies++;
            }
        }

        return $emergencies;
    }
    private function getEmergencyCalls($from, $to)
    {
        $emergencies = 0;

        foreach ($this->emergenciesList as $emergency) {
            $date = $this->getEmergencyTs($emergency['logged']);

            if ($date >= $from && $date <= $to && strpos($emergency['history'], 'call') !== false) {
                $emergencies++;
            }
        }

        return $emergencies;
    }
    private function calculateByCheckIdLongAlerts($stats, $alerts, $from, $to, $server, $saveUsersData, $user)
    {
        $lastTs          = null;
        $lastQuickAckTs  = null;
        $quickAckStarted = null;
        $alertStarted    = null;
        $alertStates     = [];
        $lastState       = null;
        $lastAlert       = null;
        $ts              = null;

        foreach ($alerts as $alert) {
            $ts        = $alert['ts'];
            $ts        = ($ts > $to)   ? $to   : $ts;
            $ts        = ($ts < $from) ? $from : $ts;
            $severity  = $alert['severity'];
            $state     = $alert['state'];
            $lastState = $state;
            $lastAlert = $alert;

            if ($alert['info']) {
                return $stats;
            }

            if ($severity == 'unhandled' && $state != 'ok') {
                if ($quickAckStarted) {
                    $stats['unhandled_time'] += ($ts - $lastTs);
                    $stats['quick_acked_time'] += ($ts - $lastQuickAckTs);
                    $lastQuickAckTs = false;
                    $quickAckStarted = false;
                }

                $alertStarted = true;
                $lastTs = $ts;
            }

            if ($severity == 'quick_acked' && !$alertStarted) {
                $alertStarted = true;
                $lastTs = $ts;
                $lastQuickAckTs = $ts;
                $quickAckStarted = true;
            }

            if ($severity == 'quick_acked') {
                if ($alertStarted) {
                    $alertStarted = false;
                }

                $lastQuickAckTs = $ts;
                $quickAckStarted = true;
            }

            if (    $state == 'ok'
                 || $severity == 'planned_downtime'
                 || (in_array($severity, ['acked', 'sched']) && !$quickAckStarted)
                 || (in_array($severity, ['acked', 'sched']) && $quickAckStarted && ($ts - $lastQuickAckTs) < 300)
            ) {
                $alertStarted = false;
                $lastTs = null;
                $lastQuickAckTs = null;
                $quickAckStarted = false;
            }

            if (in_array($severity, ['acked', 'sched']) && $quickAckStarted && ($ts - $lastQuickAckTs) >= 300) {
                $stats['unhandled_time'] += ($ts - $lastTs);
                $stats['quick_acked_time'] += ($ts - $lastQuickAckTs);
                $stats['reaction_time'] += ($ts - $lastTs);
                $stats['reaction_alerts']++;

                $this->setUsersAlerts($server, $saveUsersData, $alert, $user, true);
                if (in_array($lastState, ['warning', 'critical', 'unknown'])) {
                    $alertStates[] = $lastState;
                }
            }

            if ($state == 'ok' || in_array($severity, ['acked', 'sched', 'planned_downtime'])) {
                $alertStarted = false;
                $lastTs = null;
                $lastQuickAckTs = null;
                $quickAckStarted = false;
            }
        }

        if ($lastTs && $quickAckStarted && $lastAlert && $lastQuickAckTs && ($lastTs - $lastQuickAckTs) >= 300) {
            $stats['unhandled_time'] += ($ts - $lastTs);
            $stats['quick_acked_time'] += ($ts - $lastQuickAckTs);
            $stats['reaction_time'] += ($ts - $lastTs);
            $stats['reaction_alerts']++;

            $this->setUsersAlerts($server, $saveUsersData, $lastAlert, $user, true);
            if (in_array($lastState, ['warning', 'critical', 'unknown'])) {
                $alertStates[] = $lastState;
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
    private function calculateByCheckId($stats, $alerts, $from, $to, $server, $saveUsersData, $user)
    {
        $stats['long']   = $this->calculateByCheckIdLongAlerts($stats['long'], $alerts, $from, $to, $server, $saveUsersData, $user);
        $lastTs          = null;
        $lastQuickAckTs  = null;
        $quickAckStarted = null;
        $alertStarted    = null;
        $alertStates     = [];

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

            if ($severity == 'unhandled' && $state != 'ok') {
                $this->setUsersAlerts($server, $saveUsersData, $alert, $user);

                if ($quickAckStarted) {
                    $stats['unhandled_time'] += ($ts - $lastTs);
                    $stats['quick_acked_time'] += ($ts - $lastQuickAckTs);
                    $lastQuickAckTs = false;
                    $quickAckStarted = false;
                }

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
            foreach (['normal', 'long'] as $type) {
                $result = [
                    'alerts_count'     => 0,
                    'warning_count'    => 0,
                    'critical_count'   => 0,
                    'unknown_count'    => 0,
                    'info_count'       => 0,
                    'emergency_count'  => 0,
                    'emergency_calls'  => 0,
                    'unhandled_time'   => 0,
                    'quick_acked_time' => 0,
                    'reaction_time'    => 0,
                    'reaction_alerts'  => 0,
                    'worked_total'     => 0,
                    'worked_on_shift'  => 0,
                    'worked_total_list'    => [],
                    'worked_on_shift_list' => [],
                    'worked_no_shift'  => [
                        'quick_acked_time' => 0,
                        'check_ids'        => [],
                        'warning_count'    => 0,
                        'critical_count'   => 0,
                        'unknown_count'    => 0,
                        'info_count'       => 0,
                        'emergency_count'  => 0,
                        'list'             => [],
                    ],
                ];

                $emergency = true;

                foreach ($stats as $server => $stat) {
                    if ($type == 'long') {
                        $stat = $stat['long'];
                    }

                    $result['alerts_count']     += $stat['alerts_count'];
                    $result['warning_count']    += $stat['warning_count'];
                    $result['critical_count']   += $stat['critical_count'];
                    $result['unknown_count']    += $stat['unknown_count'];
                    $result['info_count']       += $stat['info_count'];
                    $result['unhandled_time']   += $stat['unhandled_time'];
                    $result['quick_acked_time'] += $stat['quick_acked_time'];
                    $result['reaction_time']    += $stat['reaction_time'];
                    $result['reaction_alerts']  += $stat['reaction_alerts'];
                    $result['worked_no_shift']['quick_acked_time'] += $stat['worked_no_shift']['quick_acked_time'];
                    $result['worked_no_shift']['warning_count']    += $stat['worked_no_shift']['warning_count'];
                    $result['worked_no_shift']['critical_count']   += $stat['worked_no_shift']['critical_count'];
                    $result['worked_no_shift']['unknown_count']    += $stat['worked_no_shift']['unknown_count'];
                    $result['worked_no_shift']['emergency_count']  += $stat['worked_no_shift']['emergency_count'];

                    if ($emergency) {
                        $result['emergency_count']  += $stat['emergency_count'];
                        $result['emergency_calls']  += $stat['emergency_calls'];

                        $emergency = false;
                    }

                    if (isset($stat['worked_no_shift']['check_ids'])) {
                        foreach ($stat['worked_no_shift']['check_ids'] as $check_id) {
                            if (!in_array($check_id, $result['worked_no_shift']['check_ids'])) {
                                $result['worked_no_shift']['check_ids'][] = $check_id;
                            }
                        }
                    }

                    if (isset($stat['worked_no_shift']['list'])) {
                        foreach ($stat['worked_no_shift']['list'] as $check_id => $alert) {
                            if (!isset($result['worked_no_shift']['list'][$check_id])) {
                                $result['worked_no_shift']['list'][$check_id] = $alert;
                            }
                        }
                    }

                    if (isset($stat['worked_total_list'])) {
                        foreach ($stat['worked_total_list'] as $check_id => $alert) {
                            if (!isset($result['worked_total_list'][$check_id])) {
                                $result['worked_total_list'][$check_id] = $alert;
                            }
                        }
                    }

                    if (isset($stat['worked_on_shift_list'])) {
                        foreach ($stat['worked_on_shift_list'] as $check_id => $alert) {
                            if (!isset($result['worked_on_shift_list'][$check_id])) {
                                $result['worked_on_shift_list'][$check_id] = $alert;
                            }
                        }
                    }
                }

                $result['worked_total']    = count($result['worked_total_list']);
                $result['worked_on_shift'] = count($result['worked_on_shift_list']);

                if ($type == 'long') {
                    $this->results[$name]['All']['long'] = $result;
                } else {
                    $this->results[$name]['All'] = $result;
                }
            }
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
                                'start'  => $shift['finish'] + 1,
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

                if ($stat['long']['reaction_alerts']) {
                    $this->results[$name][$server]['long']['reaction_avg'] = round($stat['long']['reaction_time'] / $stat['long']['reaction_alerts'] , 2);
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

        $this->from = $this->utils->correctTs($this->from);
        $this->to   = $this->utils->correctTs($this->to);
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
        $from = $this->utils->getDateForDB($this->from, false);
        $to   = $this->utils->getDateForDB($this->to, false);

        $this->history = $this->db->historyGetUnfinishedAlertsWithPeriod($from, $to);
        $this->emergencies = $this->db->getEmergenciesList(1000, 0, $from, $to);

        $this->clearEmergencies();
        $this->groupByCheckId();
    }
    private function clearEmergencies()
    {
        foreach ($this->emergencies as $emergency) {
            if ($emergency['host'] != 'emergency line') {
                $this->emergenciesList[] = $emergency;
            }
        }
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
