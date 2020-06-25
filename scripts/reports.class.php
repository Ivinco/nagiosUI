<?php

class reports
{
    private $from;
    private $to;
    private $usersShifts = [];
    private $usersList = [];
    private $servers = [];
    private $history = [];
    private $results = [];
    private $stats = [];
    private $actionsList = [];
    private $calendar;
    private $db;
    private $serversList;
    private $timeZone;
    private $weeklyStatsEmail;
    private $summaryReportName = 'Summary report';

    function __construct()
    {
        global $serversList;
        global $timeZone;
        global $weeklyStatsEmail;

        $this->weeklyStatsEmail = $weeklyStatsEmail;
        $this->timeZone    = $timeZone;
        $this->serversList = $serversList;
        $this->servers     = array_keys($this->serversList);

        $this->calendar  = new calendar;
        $this->db        = new db;
        $this->usersList = $this->db->usersListStatsPage();
    }

    public function weeklyStats()
    {
        $this->setDates();
        $this->actionsList = $this->db->getActionsByDate($this->returnDateForDb($this->from), $this->returnDateForDb($this->to));
        $this->runCalendar();
        $this->getStats();
        $this->sendEmail();
    }
    private function sendEmail()
    {
        if ($this->weeklyStatsEmail) {
            $subject = "nagios weekly report";
            $txt = $this->returnDateForDb($this->from) . " - " . $this->returnDateForDb($this->to) . "\r\n\r\n";
            $txt .= "NAGIOS WEEKLY REPORT" . "\r\n\r\n";

            foreach ($this->stats as $key => $value) {
                $txt .= "\r\n" . $key . "\r\n";
                $txt .= "-------------------------------------------------------\r\n";

                foreach ($value as $item) {
                    if ($key == 'ALERTS BY ALERT-MINUTES') {
                        $txt .= " - service: " . $item['service_name'] . "\r\n";
                        $txt .= " - alert_minutes: " . $item['alert_minutes'] . "\r\n";
                        $txt .= " - pct: " . $item['pct'] . "\r\n";
                        $txt .= " - per host stats: " . $item['per_host_stats'] . "\r\n";
                        $txt .= " - per duty: " . $item['per_duty'] . "\r\n\r\n";
                    }

                    if ($key == 'ALERTS BY INCIDENTS') {
                        $txt .= $item['service_name'] . " - ". $item['incidents'] ." incidents (". $item['minutes'] .")\r\n";
                        $txt .= " - by days: " . $item['by_days'] . "\r\n";
                        $txt .= " - by hours: " . $item['by_hour'] . "\r\n";
                        $txt .= " - top 5 hosts: " . $item['top_5_hosts'] . "\r\n\r\n";
                    }

                    if ($key == 'TOP 5 ACKNOWLEDGMENTS') {
                        $txt .= $item['service_name'] . " - ". $item['ack_count'] ."\r\n";
                        $txt .= " - by days: " . $item['by_days'] . "\r\n\r\n";
                    }

                    if ($key == 'TOP ADMINS BY # OF ACKS') {
                        $txt .= $item['author'] . " - ". $item['total'] ." acknowledgements\r\n";

                        foreach ($item['services'] as $service) {
                            $txt .= " - " . $service . "\r\n";
                        }

                        $txt .= "\r\n";
                    }
                }
            }
            mail($this->weeklyStatsEmail, $subject, $txt);

            die("ok\n");
        } else {
            die("\$weeklyStatsEmail is not set in config.\n");
        }
    }
    private function setDates()
    {
        $this->from = strtotime('monday last week');
        $this->to   = strtotime('monday this week -1 second');
    }
    private function runCalendar()
    {
        $this->calendar->setTime($this->from, $this->to);
        $this->usersShifts = $this->calendar->getEvents();
    }
    private function getStats()
    {
        $this->history = [];
        $this->getStatsDataFromDb();
        $this->results[$this->summaryReportName] = $this->calculateByServer($this->from, $this->to, $this->summaryReportName, [], $this->history, true);
        $this->getStatsByUser();
        $this->calculateStats();
    }

    private function calculateStats()
    {
        $this->calculateStatsAlertsByAlertMinutes();
        $this->calculateStatsAlertsByIncidents();
        $this->calculateStatsTop5Acks();
        $this->calculateStatsTopAdminsByAcks();
    }

    private function calculateStatsTopAdminsByAcks()
    {
        $topAdmins = [];
        $this->stats['TOP ADMINS BY # OF ACKS'] = [];

        foreach ($this->actionsList as $host => $data) {
            foreach ($data as $service => $item) {
                foreach ($item as $alert) {
                    $author = $alert['author'];

                    if (!$author) {
                        continue;
                    }

                    if (!isset($topAdmins[$author])) {
                        $topAdmins[$author] = [
                            'author'   => $author,
                            'total'    => 0,
                            'services' => [],
                        ];
                    }

                    if (!isset($topAdmins[$author]['services'][$service])) {
                        $topAdmins[$author]['services'][$service] = [
                            'service' => $service,
                            'total'   => 0,
                        ];
                    }

                    $topAdmins[$author]['total']++;
                    $topAdmins[$author]['services'][$service]['total']++;
                }
            }
        }

        usort($topAdmins, function ($item1, $item2) {
            if ($item1['total'] == $item2['total']) return 0;
            return $item1['total'] > $item2['total'] ? -1 : 1;
        });

        for ($i = 0; $i < count($topAdmins); $i++) {
            $this->stats['TOP ADMINS BY # OF ACKS'][$i] = [
                'author'   => $topAdmins[$i]['author'],
                'total'    => $topAdmins[$i]['total'],
                'services' => $this->getTopServicessStats($topAdmins[$i]['services']),
            ];
        }
    }
    private function getTopServicessStats($services)
    {
        $list = [];

        usort($services, function ($item1, $item2) {
            if ($item1['total'] == $item2['total']) return 0;
            return $item1['total'] > $item2['total'] ? -1 : 1;
        });

        for ($i = 0; $i < 5; $i++) {
            $list[$i] = $services[$i]['service'] . " - " . $services[$i]['total'];
        }

        return $list;
    }

    private function calculateStatsTop5Acks()
    {
        $this->stats['TOP 5 ACKNOWLEDGMENTS'] = [];
        $topAcks = [];

        foreach ($this->results[$this->summaryReportName]['_alert_by_service'] as $service => $data) {
            $topAcks[$service] = [
                'service' => $service,
                'acks'    => 0,
                'dates'   => [],
            ];

            foreach ($data as $host => $item) {
                $topAcks[$service]['acks'] += $item['acks']['total'];

                foreach ($item['acks']['dates'] as $date) {
                    $topAcks[$service]['dates'][] = $date;
                }
            }
        }

        usort($topAcks, function ($item1, $item2) {
            if ($item1['acks'] == $item2['acks']) return 0;
            return $item1['acks'] > $item2['acks'] ? -1 : 1;
        });

        for ($i = 0; $i < 5; $i++) {
            $this->stats['TOP 5 ACKNOWLEDGMENTS'][$i] = [
                'service_name'   => $topAcks[$i]['service'],
                'ack_count'      => $topAcks[$i]['acks'],
                'by_days'        => $this->getByDaysStats($topAcks[$i]['dates']),
            ];
        }
    }

    private function calculateStatsAlertsByIncidents()
    {
        $this->stats['ALERTS BY INCIDENTS'] = [];
        $totalByIncidents = [];

        foreach ($this->results[$this->summaryReportName]['_alert_by_service'] as $service => $data) {
            $totalByIncidents[$service] = [
                'time'      => 0,
                'incidents' => 0,
                'service'   => $service,
                'hosts'     => [],
                'dates'     => [],
            ];

            foreach ($data as $host => $item) {
                $totalByIncidents[$service]['incidents'] += count($item['date']);
                $totalByIncidents[$service]['hosts'][] = [
                    'host'      => $host,
                    'incidents' => count($item['date']),
                ];

                foreach ($item['date'] as $date) {
                    $totalByIncidents[$service]['dates'][] = $date;
                }

                $totalByIncidents[$service]['time'] += $item['time'];
            }
        }

        usort($totalByIncidents, function ($item1, $item2) {
            if ($item1['incidents'] == $item2['incidents']) return 0;
            return $item1['incidents'] > $item2['incidents'] ? -1 : 1;
        });

        for ($i = 0; $i < 5; $i++) {
            $service   = $totalByIncidents[$i]['service'];

            $this->stats['ALERTS BY INCIDENTS'][$i] = [
                'service_name'   => $service,
                'incidents'      => $totalByIncidents[$i]['incidents'],
                'minutes'        => floor($totalByIncidents[$i]['time'] / 60) . "min",
                'by_days'        => $this->getByDaysStats($totalByIncidents[$i]['dates']),
                'by_hour'        => $this->getByHourStats($totalByIncidents[$i]['dates']),
                'top_5_hosts'    => $this->getByTop5HostsStats($totalByIncidents[$i]['hosts']),
            ];
        }
    }
    private function getByTop5HostsStats($hosts)
    {
        $result = "";
        $list   = [];

        usort($hosts, function ($item1, $item2) {
            if ($item1['incidents'] == $item2['incidents']) return 0;
            return $item1['incidents'] > $item2['incidents'] ? -1 : 1;
        });

        for ($i = 0; $i < 5; $i++) {
            $list[$i] = $hosts[$i]['host'] . ":" . $hosts[$i]['incidents'];
        }

        $result .= "(total ". count($hosts) .") ";
        $result .= implode("|", $list);

        return $result;
    }
    private function getByHourStats($dates)
    {
        $day = array_fill(0, 24, 0);

        foreach ($dates as $date) {
            $date    = DateTime::createFromFormat("Y-m-d H:i:s", $date, new DateTimeZone($this->timeZone));
            $weekDay = $date->format("G");

            $day[$weekDay]++;
        }

        return implode("|", $day);
    }
    private function getByDaysStats($dates)
    {
        $week = array_fill(1, 7, 0);

        foreach ($dates as $date) {
            $date    = DateTime::createFromFormat("Y-m-d H:i:s", $date, new DateTimeZone($this->timeZone));
            $weekDay = $date->format("w");

            if ($weekDay == 0) {
                $weekDay = 7;
            }

            $week[$weekDay]++;
        }

        return implode("|", $week);
    }

    private function calculateStatsAlertsByAlertMinutes()
    {
        $this->stats['ALERTS BY ALERT-MINUTES'] = [];

        $totalTime = $this->results[$this->summaryReportName]['_alert_time'];
        $totalTimeByService = [];

        foreach ($this->results[$this->summaryReportName]['_alert_by_service'] as $service => $data) {
            $totalTimeByService[$service] = [
                'time'    => 0,
                'service' => $service,
            ];

            foreach ($data as $host => $item) {
                $totalTimeByService[$service]['time'] += $item['time'];
            }
        }

        usort($totalTimeByService, function ($item1, $item2) {
            if ($item1['time'] == $item2['time']) return 0;
            return $item1['time'] > $item2['time'] ? -1 : 1;
        });

        for ($i = 0; $i < 5; $i++) {
            $alertTime = $totalTimeByService[$i]['time'];
            $service   = $totalTimeByService[$i]['service'];

            $this->stats['ALERTS BY ALERT-MINUTES'][$i] = [
                'service_name'   => $service,
                'alert_minutes'  => floor($alertTime / 60) . "min",
                'pct'            => round(($alertTime / $totalTime) * 100, 1),
                'per_host_stats' => $this->getPerHostStats($service),
                'per_duty'       => $this->getPerDutyStats($service),
            ];
        }
    }
    private function getPerHostStats($service)
    {
        $list  = "";
        $hosts = $this->results[$this->summaryReportName]['_alert_by_service'][$service];

        usort($hosts, function ($item1, $item2) {
            if ($item1['time'] == $item2['time']) return 0;
            return $item1['time'] > $item2['time'] ? -1 : 1;
        });

        foreach ($hosts as $key => $host) {
            $list .= $host['host'] . ": " . floor($host['time'] / 60) . "min";

            if ($key + 1 != count($hosts)) {
                $list .= ", ";
            }
        }

        return $list;
    }
    private function getPerDutyStats($service)
    {
        $list   = [];
        $result = [];

        foreach ($this->results as $user => $data) {
            if ($user == $this->summaryReportName) {
                continue;
            }

            if (isset($data['_alert_by_service'][$service])) {
                if (!isset($list[$user])) {
                    $list[$user] = [
                        'name' => $user,
                        'time' => 0,
                    ];
                }

                foreach ($data['_alert_by_service'][$service] as $item) {
                    $list[$user]['time'] += $item['time'];
                }
            }
        }

        usort($list, function ($item1, $item2) {
            if ($item1['time'] == $item2['time']) return 0;
            return $item1['time'] > $item2['time'] ? -1 : 1;
        });

        foreach ($list as $key => $item) {
            $time = floor($item['time'] / 60);

            if ($time) {
                $result[] = $item['name'] . ": " . $time . "min";
            }
        }

        return implode(", ", $result);
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
    private function calculateByServer($from, $to, $user, $stats, $alertsList, $saveUsersData = false)
    {
        if (!isset($stats[$user])) {
            $stats[$user] = [];
        }

        foreach ($alertsList as $server => $data) {
            if (!isset($stats[$user])) {
                $stats[$user] = [
                    '_alert_time' => 0,
                    '_alert_by_service' => [],
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
                } else {
                    continue;
                }

                $stats[$user] = $this->calculateByCheckId($stats[$user], $alerts, $from, $to, $server, $saveUsersData, $user);
            }
        }

        return $stats[$user];
    }
    private function getUserFullName($name, $server) {
        if (isset($this->usersList[$server]) && isset($this->usersList[$server][$name])) {
            return $this->usersList[$server][$name];
        }

        return '';
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
    private function calculateByCheckId($stats, $alerts, $from, $to, $server, $saveUsersData, $user)
    {
        $thisService     = null;
        $thisHost        = null;
        $lastTs          = null;
        $lastQuickAckTs  = null;
        $quickAckStarted = null;
        $alertStarted    = null;

        foreach ($alerts as $alert) {
            $thisService = $alert['service'];
            $thisHost    = $alert['host'];

            $ts       = $alert['ts'];
            $ts       = ($ts > $to)   ? $to   : $ts;
            $ts       = ($ts < $from) ? $from : $ts;
            $severity = $alert['severity'];
            $state    = $alert['state'];
            $host     = $alert['host'];
            $service  = $alert['service'];

            if ($alert['info']) {
                continue;
            }

            if (!isset($stats['_alert_time'])) {
                $stats['_alert_time'] = 0;
            }

            if (!isset($stats['_alert_by_service'][$service])) {
                $stats['_alert_by_service'][$service] = [];
            }

            if (!isset($stats['_alert_by_service'][$service][$host])) {
                $stats['_alert_by_service'][$service][$host] = [
                    'host' => $host,
                    'time' => 0,
                    'date' => [],
                    'acks' => [
                        'total'   => 0,
                        'authors' => [],
                        'dates'   => [],
                    ],
                ];
            }

            if ($severity == 'unhandled' && $state != 'ok') {
                $this->setUsersAlerts($server, $saveUsersData, $alert, $user);
                $lastTs = $ts;

                $stats['_alert_by_service'][$service][$host]['date'][] = $alert['date'];
            }

            if ((in_array($severity, ['quick_acked', 'acked', 'sched', 'planned_downtime']) || $state == 'ok') && $lastTs) {
                $this->setUsersAlerts($server, $saveUsersData, $alert, $user);
                $stats['_alert_time'] += ($ts - $lastTs);
                $stats['_alert_by_service'][$service][$host]['time'] += ($ts - $lastTs);

                $lastTs = null;
            }
        }

        if (isset($this->actionsList[$thisHost]) && isset($this->actionsList[$thisHost][$thisService])) {
            foreach ($this->actionsList[$thisHost][$thisService] as $ack) {
                $author = $ack['author'];
                $logged = $ack['logged'];

                if (!$author) {
                    continue;
                }

                if ($logged >= $this->returnDateForDb($from) && $logged <= $this->returnDateForDb($to)) {
                    if (!isset($stats['_alert_by_service'][$thisService][$thisHost]['acks']['authors'][$author])) {
                        $stats['_alert_by_service'][$thisService][$thisHost]['acks']['authors'][$author] = 0;
                    }

                    if (!isset($stats['_alert_by_service'][$thisService][$thisHost]['acks']['total'])) {
                        $stats['_alert_by_service'][$thisService][$thisHost]['acks']['total'] = 0;
                    }

                    $stats['_alert_by_service'][$thisService][$thisHost]['acks']['total']++;
                    $stats['_alert_by_service'][$thisService][$thisHost]['acks']['authors'][$author]++;
                    $stats['_alert_by_service'][$thisService][$thisHost]['acks']['dates'][] = $ack['logged'];
                }
            }
        }

        return $stats;
    }
    private function setUsersAlerts($server, $saveUsersData, $alert, $user)
    {
        if (!$saveUsersData) {
            if ($alert['user']) {
                $full_name = $this->getUserFullName($alert['user'], $server);

                if ($user == $full_name) {
                    if (!isset($this->usersAlerts[$full_name])) {
                        $this->usersAlerts[$full_name] = [];
                    }

                    if (!isset($this->usersAlerts[$full_name][$alert['check_id']])) {
                        $this->usersAlerts[$full_name][$alert['check_id']] = [
                            'host'    => $alert['host'],
                            'service' => $alert['service'],
                            'comment' => [],
                        ];
                    }

                    if ($alert['comment'] && !in_array($alert['comment'], $this->usersAlerts[$full_name][$alert['check_id']]['comment'])) {
                        $this->usersAlerts[$full_name][$alert['check_id']]['comment'][] = $alert['comment'];
                    }
                }
            }

            return;
        }

        if (!isset($this->usersAlerts[$this->summaryReportName])) {
            $this->usersAlerts[$this->summaryReportName] = [$this->summaryReportName => []];
        }

        if (!isset($this->usersAlerts[$this->summaryReportName][$this->summaryReportName][$alert['check_id']])) {
            $this->usersAlerts[$this->summaryReportName][$this->summaryReportName][$alert['check_id']] = [
                'host'    => $alert['host'],
                'service' => $alert['service'],
                'comment' => [],
            ];
        }

        if ($alert['comment'] && !in_array($alert['comment'], $this->usersAlerts[$this->summaryReportName][$this->summaryReportName][$alert['check_id']]['comment'])) {
            $this->usersAlerts[$this->summaryReportName][$this->summaryReportName][$alert['check_id']]['comment'][] = $alert['comment'];
        }

        if ($alert['user']) {
            $full_name = $this->getUserFullName($alert['user'], $server);

            if (!isset($this->usersAlerts[$this->summaryReportName][$full_name])) {
                $this->usersAlerts[$this->summaryReportName][$full_name] = [];
            }

            if (!isset($this->usersAlerts[$this->summaryReportName][$full_name][$alert['check_id']])) {
                $this->usersAlerts[$this->summaryReportName][$full_name][$alert['check_id']] = [
                    'host'    => $alert['host'],
                    'service' => $alert['service'],
                    'comment' => [],
                ];
            }

            if ($alert['comment'] && !in_array($alert['comment'], $this->usersAlerts[$this->summaryReportName][$full_name][$alert['check_id']]['comment'])) {
                $this->usersAlerts[$this->summaryReportName][$full_name][$alert['check_id']]['comment'][] = $alert['comment'];
            }
        }
    }

    private function getStatsDataFromDb()
    {
        $from = $this->returnDateForDb($this->from);
        $to   = $this->returnDateForDb($this->to);
        $this->history = $this->db->historyGetUnfinishedAlertsWithPeriod($from, $to);

        $this->groupByCheckId();
    }
    private function returnDateForDb($timestamp) {
        $diff = strtotime(gmdate("Y-m-d H:i:s")) - strtotime(date("Y-m-d H:i:s"));
        $timestamp -= $diff;

        $date = new DateTime("@{$timestamp}");
        $date->setTimezone(new DateTimeZone('UTC'));

        return $date->format('Y-m-d H:i:s');
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
