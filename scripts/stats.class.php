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
        $this->timeCorrectionDiff = ($this->timeCorrectionType == 'browser' && isset($_GET['time_correction_diff'])) ? $_GET['time_correction_diff'] : 0;
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

        $this->fullResults['Summary report'] = $this->getStats();
        $this->fullResults['Nobody\'s shift'] = $this->fullResults['Summary report'];

        $this->getStatsByUsers();
        $this->setAverages();

        return $this->fullResults;
    }

    private function validate()
    {
        if ($this->dateFrom && !$this->validateDate($this->dateFrom)) {
            $this->returnError('date_from format must be: "1970-01-01 00:00:00" or timestamp');
        }
        if ($this->dateTo && !$this->validateDate($this->dateTo)) {
            $this->returnError('date_to format must be: "1970-01-01 00:00:00" or timestamp');
        }
        if (!$this->dateFrom || !$this->dateTo) {
            $this->returnError('date_from and date_to must be set. Date format: "1970-01-01 00:00:00" or timestamp');
        }
    }

    private function getStats()
    {
        $this->history = [];
        $this->results = [];
        $this->getStatsDataFromDb();
        $this->calcData();

        return $this->results;
    }
    private function runCalendar()
    {
        $this->calendar->setTime($this->dateFromTs, $this->dateToTs);
        $this->usersShifts = $this->calendar->getEvents();
    }
    private function getStatsByUsers()
    {
        foreach ($this->usersShifts as $user => $dates) {
            $tmpUserData = [];
            $this->fullResults[$user] = [];

            foreach ($dates as $record) {
                $this->setDates($record['start'], $record['finish']);
                $tmpUserData[] = $this->getStats();
            }

            foreach ($tmpUserData as $tmpRecord) {
                foreach ($tmpRecord as $server => $serverData) {

                    $this->fullResults[$user][$server] = [
                        'alerts_count'     => 0,
                        'unhandled_time'   => 0,
                        'quick_acked_time' => 0,
                        'reaction_time'    => 0,
                        'reaction_alerts'  => 0,
                    ];

                    $this->fullResults[$user][$server]['alerts_count']     += $serverData['alerts_count'];
                    $this->fullResults[$user][$server]['unhandled_time']   += $serverData['unhandled_time'];
                    $this->fullResults[$user][$server]['quick_acked_time'] += $serverData['quick_acked_time'];
                    $this->fullResults[$user][$server]['reaction_time']    += $serverData['reaction_time'];
                    $this->fullResults[$user][$server]['reaction_alerts']  += $serverData['reaction_alerts'];
                }
            }
        }
    }
    private function setAverages()
    {
        foreach ($this->fullResults as $user => $userData) {
            if (in_array($user, ['Summary report', 'Nobody\'s shift'])) {
                continue;
            }

            foreach ($userData as $server => $serverData) {
                $this->fullResults['Nobody\'s shift'][$server]['alerts_count']     -= $serverData['alerts_count'];
                $this->fullResults['Nobody\'s shift'][$server]['unhandled_time']   -= $serverData['unhandled_time'];
                $this->fullResults['Nobody\'s shift'][$server]['quick_acked_time'] -= $serverData['quick_acked_time'];
                $this->fullResults['Nobody\'s shift'][$server]['reaction_time']    -= $serverData['reaction_time'];
                $this->fullResults['Nobody\'s shift'][$server]['reaction_alerts']  -= $serverData['reaction_alerts'];
            }
        }

        foreach ($this->fullResults['Nobody\'s shift'] as $server => $serverData) {
            if ($serverData['alerts_count'] < 0) {
                $this->fullResults['Nobody\'s shift'][$server]['alerts_count'] = $serverData['alerts_count'] * -1;
            }

            if ($serverData['reaction_alerts'] < 0) {
                $this->fullResults['Nobody\'s shift'][$server]['reaction_alerts'] = $serverData['reaction_alerts'] * -1;
            }
        }

        foreach ($this->fullResults as $user => $userData) {
            if (in_array($user, ['Summary report'])) {
                continue;
            }

            foreach ($userData as $server => $serverData) {
                $this->fullResults[$user][$server]['reaction_avg'] = (($this->fullResults[$user][$server]['reaction_alerts']) ? (round($this->fullResults[$user][$server]['reaction_time'] / $this->fullResults[$user][$server]['reaction_alerts'], 2)) : 0);
            }
        }
    }
    private function returnError($message)
    {
        http_response_code(400);
        die($message);
    }
    private function validateDate($date){
        $d = DateTime::createFromFormat($this->dateTimeFormat, $date);
        return $d && $d->format($this->dateTimeFormat) === $date;
    }
    private function isTimestamp($timestamp) {
        if (strlen($timestamp) == 10 && strval(intval($timestamp)) == $timestamp) {
            return true;
        }

        return false;
    }
    private function setFormatedDates()
    {
        $this->dateFrom   = (isset($_GET['date_from']) && $_GET['date_from']) ? $_GET['date_from'] : '';
        $this->dateFrom   = ($this->isTimestamp($this->dateFrom)) ? $this->returnConstructDateFromTimestamp($this->dateFrom) : $this->dateFrom;
        $this->dateTo     = (isset($_GET['date_to'])   && $_GET['date_to'])   ? $_GET['date_to']   : '';
        $this->dateTo     = ($this->isTimestamp($this->dateTo)) ? $this->returnConstructDateFromTimestamp($this->dateTo) : $this->dateTo;
        $this->dateFromTs = $this->returnTimestampWithTimezone($this->dateFrom);
        $this->dateToTs   = $this->returnTimestampWithTimezone($this->dateTo);
    }
    private function setDates($from, $to)
    {
        $this->dateFrom   = $this->returnDateFromTimestamp($from);
        $this->dateTo     = $this->returnDateFromTimestamp($to);
        $this->dateFromTs = $from + $this->returnDiff();
        $this->dateToTs   = $to + $this->returnDiff();
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
    private function returnDateFromTimestamp($timestamp) {
        $date = new DateTime("@{$timestamp}");
        $date->setTimezone(new DateTimeZone('America/New_York'));

        return $date->format($this->dateTimeFormat);
    }
    private function getStatsDataFromDb()
    {
        foreach ($this->servers as $item) {
            $this->history[$item] = $this->db->historyGetUnfinishedAlertsWithPeriod($item, $this->dateFrom, $this->dateTo);
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
    private function calcData() {
        foreach ($this->history as $server => $data) {
            $this->results[$server] = [
                'alerts_count'     => 0,
                'unhandled_time'   => 0,
                'quick_acked_time' => 0,
                'reaction_time'    => 0,
                'reaction_alerts'  => 0,
            ];

            foreach ($data as $check_id => $dataList) {
                $this->lastTs          = null;
                $this->lastQuickAckTs  = null;
                $this->quickAckStarted = null;
                $this->alertStarted    = null;

                foreach ($dataList as $key => $record) {
                    $ts       = $record['ts'];
                    $severity = $record['severity'];
                    $state    = $record['state'];

                    if ($record['info']) {
                        continue;
                    }

                    if ($severity == 'unhandled' && $state != 'ok') {
                        $this->alertStarted = true;
                        $this->lastTs = ($this->dateFromTs > $ts ? $this->dateFromTs : $ts);
                        $this->results[$server]['alerts_count']++;
                    }

                    if ($severity == 'quick_acked' && !$this->alertStarted) {
                        $this->alertStarted = true;
                        $this->lastTs = $ts;

                        $this->lastQuickAckTs = $ts;
                        $this->quickAckStarted = true;

                        $this->results[$server]['alerts_count']++;
                    }

                    if ($severity == 'quick_acked') {
                        $this->addReactionData($server, $ts - $this->lastTs);

                        $this->lastQuickAckTs = $ts;
                        $this->quickAckStarted = true;
                    }

                    if (in_array($severity, ['acked', 'sched', 'planned_downtime']) && $this->lastTs) {
                        $this->addUnhandledTime($server, $ts - $this->lastTs);
                        $this->addReactionData($server, $ts - $this->lastTs);
                        $this->addQuickAckTime($server, $ts - $this->lastQuickAckTs);

                        $this->lastTs = null;
                    }

                    if ($state == 'ok' && $this->lastTs) {
                        $this->addUnhandledTime($server, $ts - $this->lastTs);
                        $this->addReactionData($server, $ts - $this->lastTs);
                        $this->addQuickAckTime($server, $ts - $this->lastQuickAckTs);

                        $this->lastTs = null;
                    }
                }

                if ($this->lastTs) {
                    $this->addUnhandledTime($server, $this->dateToTs - $this->lastTs);
                    $this->addReactionData($server, $this->dateToTs - $this->lastTs);
                    $this->addQuickAckTime($server, $this->dateToTs - $this->lastQuickAckTs);
                }
            }
        }

        $this->setAverage();
    }
    private function setAverage()
    {
        $results['All'] = [
            'alerts_count'     => 0,
            'unhandled_time'   => 0,
            'quick_acked_time' => 0,
            'reaction_time'    => 0,
            'reaction_alerts'  => 0,
        ];

        foreach ($this->results as $server => $data) {
            $results['All']['alerts_count']     += $data['alerts_count'];
            $results['All']['unhandled_time']   += $data['unhandled_time'];
            $results['All']['quick_acked_time'] += $data['quick_acked_time'];
            $results['All']['reaction_time']    += $data['reaction_time'];
            $results['All']['reaction_alerts']  += $data['reaction_alerts'];

            $data['reaction_avg'] = ($data['reaction_alerts']) ? (round($data['reaction_time'] / $data['reaction_alerts'], 2)) : 0;
            $results[$server] = $data;
        }

        $results['All']['reaction_avg'] = ($results['All']['reaction_alerts']) ? (round($results['All']['reaction_time'] / $results['All']['reaction_alerts'], 2)) : 0;

        $this->results = $results;
    }
    private function addReactionData($server, $diff)
    {
        if ($this->alertStarted) {
            $this->alertStarted = false;
            $this->results[$server]['reaction_time'] += $diff;
            $this->results[$server]['reaction_alerts']++;
        }
    }
    private function addQuickAckTime($server, $diff)
    {
        if ($this->quickAckStarted) {
            $this->results[$server]['quick_acked_time'] += $diff;
            $this->lastQuickAckTs = false;
            $this->quickAckStarted = false;
        }
    }
    private function addUnhandledTime($server, $diff)
    {
        $this->results[$server]['unhandled_time'] += $diff;
    }

    private function returnDiff() {
        global $timeZone;

        $serverTS = strtotime(gmdate("Y-m-d H:i:s"));
        date_default_timezone_set($this->returnTimeZone());
        $out = strtotime(gmdate("Y-m-d H:i:s")) - $serverTS;
        date_default_timezone_set($timeZone);

        return $out - $this->timeCorrectionDiff * 60;
    }
    private function returnTimeZone() {
        global $timeZone;

        if (in_array($this->timeCorrectionType, ['browser', 'utc'])) {
            return 'UTC';
        }

        return $timeZone;
    }
    private function returnConstructDateFromTimestamp($timestamp) {
        $date = new DateTime("@{$timestamp}");
        $date->setTimezone(new DateTimeZone($this->returnTimeZone()));

        return $date->format($this->dateTimeFormat);
    }
    private function returnTimestampWithTimezone($date) {
        return strtotime($date) + $this->returnDiff();
    }
}