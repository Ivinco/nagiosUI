<?php

class json
{
    function __construct()
    {
        global $infoRecordMark;
        global $db;

        $this->xml         = new xml;
        $this->ac          = new accessControl((isset($_GET['server_tab'])) ? $_GET['server_tab'] : '');
        $this->plannedData = new planned;
        $this->db          = $db;
        $this->utils       = new utils;

        $this->xml->setCurrentTab((isset($_GET['server_tab'])) ? $_GET['server_tab'] : '');
        $this->plannedData->server  = (isset($_GET['server_tab'])) ? $_GET['server_tab'] : '';
        $this->infoRecordMark = $infoRecordMark;

        $this->returnJson = [];
        $this->additional = [];
        $this->user       = (isset($_GET["current_user"]) && $_GET["current_user"]) ? $_GET["current_user"] : 'default';
        $this->userServers = $this->utils->returnUserServers($this->user);

        $this->fullData = json_decode(json_encode(simplexml_load_string($this->xml->returnXml(false))),TRUE);
        $this->latestActions = $this->db->getLatestActions();

        if (!$this->fullData) {
            http_response_code(404);
            die;
        }

        if (isset($this->fullData['alert']['host'])) {
            $this->fullData['alert'] = [$this->fullData['alert']];
        }

        $this->processData();
    }

    private function processData() {
        $this->formatJson();
        $this->formatAdditional();
        $this->filterByTab();
        $this->filterBySearch();
        $this->orderRecords();

        $this->additional['total_tab'] = count($this->returnJson);
        $this->additional['planned']   = $this->plannedData->returnPlannedCount();
    }

    private function formatJson() {
        if (!isset($this->fullData['alert'])) {
            return;
        }

        foreach ($this->fullData['alert'] as $item) {
            $acked           = (!is_array($item['acked']))                ? $item['acked']                : implode(' ', $item['acked']);
            $ackComment      = (!is_array($item['ack_comment']))          ? $item['ack_comment']          : implode(' ', $item['ack_comment']);
            $sched           = (!is_array($item['sched']))                ? $item['sched']                : implode(' ', $item['sched']);
            $schComment      = (!is_array($item['sched_comment']))        ? $item['sched_comment']        : implode(' ', $item['sched_comment']);
            $host            = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
            $service         = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
            $origState       = (!is_array($item['origState']))            ? $item['origState']            : implode(' ', $item['origState']);
            $notesUrl        = (!is_array($item['notes_url']))            ? $item['notes_url']            : implode(' ', $item['notes_url']);
            $state           = (!is_array($item['@attributes']['state'])) ? $item['@attributes']['state'] : implode(' ', $item['@attributes']['state']);
            $downtimeId      = (!is_array($item['downtime_id']))          ? $item['downtime_id']          : implode(' ', $item['downtime_id']);
            $lastCheck       = (!is_array($item['last_check']))           ? $item['last_check']           : implode(' ', $item['last_check']);
            $lastCheckS      = (!is_array($item['last_check_sec']))       ? $item['last_check_sec']       : implode(' ', $item['last_check_sec']);
            $duration        = (!is_array($item['duration']))             ? $item['duration']             : implode(' ', $item['duration']);
            $durationS       = (!is_array($item['durationSec9Digits']))   ? $item['durationSec9Digits']   : implode(' ', $item['durationSec9Digits']);
            $statusInfo      = (!is_array($item['status_information']))   ? $item['status_information']   : implode(' ', $item['status_information']);
            $tempAuthor      = (!is_array($item['ack_last_author']))      ? $item['ack_last_author']      : implode(' ', $item['ack_last_author']);
            $tempCommen      = (!is_array($item['ack_last_temp']))        ? $item['ack_last_temp']        : implode(' ', $item['ack_last_temp']);
            $quickAckAu      = (!is_array($item['quick_ack_author']))     ? $item['quick_ack_author']     : implode(' ', $item['quick_ack_author']);
            $plannedAuthor   = (!is_array($item['planned_author']))       ? $item['planned_author']       : implode(' ', $item['planned_author']);
            $schedStart      = (!is_array($item['sched_start']))          ? $item['sched_start']          : implode(' ', $item['sched_start']);
            $schedEnd        = (!is_array($item['sched_end']))            ? $item['sched_end']            : implode(' ', $item['sched_end']);
            $schedDuration   = (!is_array($item['sched_duration']))       ? $item['sched_duration']       : implode(' ', $item['sched_duration']);
            $pending         = (!is_array($item['pending']))              ? $item['pending']              : implode(' ', $item['pending']);
            $tab             = (!is_array($item['tab']))                  ? $item['tab']                  : implode(' ', $item['tab']);
            $pending         = intval($pending);
            $nextCheck       = (!is_array($item['next_check']))           ? $item['next_check']           : implode(' ', $item['next_check']);
            $nextCheck       = intval($nextCheck);
            $schedEnd        = intval($schedEnd);
            $hostOrService   = $item['host_or_service'];
            $plannedComment  = ['', ''];
            $isPlanned       = false;
            $showInNormal    = false;
            $schedPlanned    = true;
            $serviceOriginal = $service;
            $recheckValue    = $this->utils->getRecheckStatus($host, $service, $tab, $hostOrService, $lastCheckS);

            if (!in_array($tab, $this->userServers)) {
                continue;
            }

            $lastCheck  = $this->utils->returnCorrectedDate($lastCheck, $tab);
            $ackComment = $this->returnCorrectedComments($ackComment, $tab);
            $schComment = $this->returnCorrectedComments($schComment, $tab);

            if (!$this->ac->verifyUser($service, $this->user)) {
                continue;
            }

            $infoRecord = $this->returnInfoRecord($service, $statusInfo);

            if ($plannedRecord = $this->plannedData->findPlannedRecords($host, $service, $statusInfo, $hostOrService, $sched, $schComment, $downtimeId, $tab)) {
                $sched          = $plannedRecord['sched'];
                $schComment     = $plannedRecord['comment'];
                $acked          = 0;
                $ackComment     = '';
                $tempCommen     = '';
                $plannedAuthor  = $plannedRecord['avatar'];
                $isPlanned      = true;
                $schedPlanned   = $plannedRecord['scheduled'];
                $showInNormal   = $plannedRecord['normal'];
                $plannedComment = [$plannedRecord['command'], $plannedRecord['commentRaw']];
                $schedEnd       = $plannedRecord['end'];
            }

            $changedComments = $this->changeLatestStatus($host, $service, $acked, $ackComment, $sched, $schComment, $tab);
            if ($changedComments) {
                $sched           = $changedComments['sched'];
                $schComment      = $changedComments['schComment'];
                $acked           = $changedComments['acked'];
                $ackComment      = $changedComments['ackComment'];
                $tempCommen      = $changedComments['ackComment'];
                $quickAckAu      = $changedComments['quickAckAu'];
                $tempAuthor      = $changedComments['quickAckAu'];
            }

            $returnType = '';
            $returnType.= (($state != 'OK') && ((!$acked && !$sched && $state != 'OK') || ($acked && $tempCommen == 'temp') || ($showInNormal))) ? '__normal__' : '';
            $returnType.= ($acked && $tempCommen != 'temp') ? '__acked__' : '';
            $returnType.= ($sched) ? '__sched__' : '';

            $statusName = $state;

            if ($pending) {
                $statusName = 'PENDING';
            }

            if (($schedEnd - time()) > 7200000) {
                $statusName = 'PERMANENT';
            }

            if ($infoRecord['info']) {
                $returnType .= '__info__';
                $service = $infoRecord['service'];
                $statusInfo = $infoRecord['status'];
            }

            if ($service == 'FULL HOSTS LIST') {
                $returnType = '__hosts__';
            }

            $this->returnJson[] = array(
                'abbreviation' => array(
                    'name'  => $tab,
                    'abb'   => mb_substr($tab, 0, 1, "UTF-8"),
                ),
                'host'      => array(
                    'name'  => $host,
                    'host'  => $hostOrService,
                    'tab'   => $tab,
                ),
                'service'   => array(
                    'name'  => $service,
                    'host'  => $host,
                    'unAck' => ($acked && $tempCommen != 'temp') ? true : false,
                    'down'  => ($sched && $schedPlanned) ? true : false,
                    'notes' => $notesUrl,
                    'sched' => ($isPlanned) ? true : false,
                    'pAuth' => ($isPlanned) ? $plannedAuthor : false,
                    'qAck'  => ($tempCommen != 'temp') ? true : false,
                    'qUAck' => ($tempCommen == 'temp') ? $quickAckAu : false,
                    'qAuth' => ($tempCommen == 'temp') ? $tempAuthor : false,
                    'downId' => $downtimeId,
                    'info'   => $infoRecord['info'],
                    'pending' => $pending,
                    'schedPlanned' => $schedPlanned,
                    'original' => $serviceOriginal,
                    'recheck' => $recheckValue,
                ),
                'status'    => array(
                    'name'  => $statusName,
                    'origin'=> $origState,
                    'order' => ($state == 'CRITICAL') ? 4 : (($state == 'UNKNOWN') ? 3 : (($state == 'WARNING') ? 2 : (($state == 'OK') ? 1 : 0))),
                ),
                'last'      => array(
                    'name'  => ($pending) ? '' : $lastCheck,
                    'order' => $lastCheckS,
                ),
                'duration'  => array(
                    'name'  => ($pending) ? '' : $duration,
                    'order' => $durationS,
                    'lastCheck' => $this->duration(time() - $lastCheckS, false),
                    'end'   => $this->duration($schedEnd - time(), false),
                ),
                'comment'   => array(
                    'ack'   => $ackComment,
                    'sched' => $schComment,
                    'start' => $schedStart,
                    'end'   => $schedEnd,
                    'duration' => $schedDuration,
                    'schedPlanned' => $schedPlanned,
                ),
                'info'      => array(
                    'name'  => $statusInfo,
                    'next'  => $nextCheck,
                    'pending' => $pending,
                    'planned' => ($isPlanned) ? true : false,
                    'comment' => $plannedComment[1],
                    'command' => $plannedComment[0],
                    'schedPlanned' => $schedPlanned,
                ),
                'type'      => $returnType,
                'state'     => ($pending) ? 'PENDING' : $state,
                'search'    => strtolower(implode('_', [$host, $service, $state, $lastCheck, $duration, $ackComment, $schComment, $state, $statusInfo])),
            );
        }

        $this->plannedData->runActionsFromJson();
    }

    private function changeLatestStatus($host, $service, $acked, $ackComment, $sched, $schComment, $tab)
    {
        $needToReturn = false;
        $return = [
            'acked'      => $acked,
            'ackComment' => $ackComment,
            'sched'      => $sched,
            'schComment' => $schComment,
            'quickAckAu' => '',
        ];

        foreach ($this->latestActions as $last) {
            if ($last['host'] == $host && $last['service'] == $service && $last['server'] == $tab) {
                if ($last['command'] == 'ack') {
                    $needToReturn = true;
                    $return['acked'] = 1;
                    if ($last['comment'] == 'temp') {
                        $return['ackComment'] = $last['comment'];

                        $usersList = $this->db->returnUsersList();
                        $photo = (isset($usersList[$last['author']])) ? $usersList[$last['author']] : '';
                        $photo = ($photo) ? $photo : ((isset($usersList['default']) ? $usersList['default'] : ''));
                        $return['quickAckAu'] = md5($photo);
                    } else {
                        $return['ackComment'] = $this->utils->prepareAckSchedComment($last['comment'], $last['author'], $last['logged'], $last['server']);
                        $return['quickAckAu'] = '';
                    }
                }

                if ($last['command'] == 'unack') {
                    $needToReturn = true;
                    $return['acked'] = 0;
                    $return['ackComment'] = '';
                    $return['quickAckAu'] = '';
                }

                if ($last['command'] == 'sched') {
                    $needToReturn = true;
                    $return['acked'] = 0;
                    $return['ackComment'] = '';
                    $return['quickAckAu'] = '';
                    $return['sched'] = 1;
                    $return['schComment'] = $this->utils->prepareAckSchedComment($last['comment'], $last['author'], $last['logged'], $last['server']);
                }

                if ($last['command'] == 'unsched') {
                    $needToReturn = true;
                    $return['sched'] = 0;
                    $return['schComment'] = '';
                }
            }
        }

        return ($needToReturn) ? $return : false;
    }

    private function returnCorrectedComments($comment, $tab) {
        if (!$comment) {
            return "";
        }

        $commentTmp = explode('<br /><br />', $comment);

        foreach ($commentTmp as $key => $value) {
            $parts = explode('<br />added: ', $value);
            $parts[1] = $this->utils->returnCorrectedDate($parts[1], $tab, 'M j H:i', true);
            $commentTmp[$key] = implode('<br />added: ', $parts);
        }

        return implode('<br /><br />', $commentTmp);
    }

    private function formatAdditional() {
        $this->additional = array(
            'nagiosConfigFile'  => $this->fullData['nagios-config-file'],
            'updateHash'        => $this->fullData['hash'],
            'groupByService'    => $this->fullData['group-by-service'],
            'groupByHost'       => $this->fullData['group-by-host'],
            'normal'            => 0,
            'hosts'             => 0,
            'acked'             => 0,
            'sched'             => 0,
            'EMERGENCY'         => 0,
            'warnings'          => 0,
            'critical'          => 0,
            'unknown'           => 0,
            'infoCritical'      => 0,
            'infoWarnings'      => 0,
            'total'             => count($this->returnJson),
            'tabsList'          => $this->utils->getServerTabsListByUserServers($this->userServers),
            'tabCurrent'        => $this->xml->getCurrentTab(),
            'timeZonesList'     => $this->utils->getTimeZonesList(),
            'comentUrl'         => $this->utils->getCommentUrlList(),
        );
    }
    private function filterByTab() {
        $filter = $this->returnFilter();

        if ($filter) {
            $return = [];

            foreach ($this->returnJson as $record) {
                $fullText = $this->implode_r($record);

                if (strpos($fullText, $filter) !== false) {
                    $return[] = $record;
                }

                if (strpos($fullText, '__normal__') !== false && strpos($fullText, '__info__') === false) {
                    $this->additional['normal']++;

                    if ($record['status']['name'] == 'WARNING') {
                        $this->additional['warnings']++;
                    }

                    if ($record['status']['name'] == 'CRITICAL') {
                        $this->additional['critical']++;
                    }

                    if ($record['status']['name'] == 'UNKNOWN') {
                        $this->additional['unknown']++;
                    }
                }

                if (strpos($fullText, '__normal__') !== false && strpos($fullText, '__info__') !== false) {
                    if ($record['status']['name'] == 'WARNING') {
                        $this->additional['infoWarnings']++;
                    }

                    if ($record['status']['name'] == 'CRITICAL') {
                        $this->additional['infoCritical']++;
                    }
                }

                if (strpos($fullText, '__acked__') !== false && strpos($fullText, '__info__') === false) {
                    $this->additional['acked']++;
                }

                if (strpos($fullText, '__sched__') !== false && strpos($fullText, '__info__') === false) {
                    $this->additional['sched']++;
                }

                if (strpos($fullText, '__hosts__') !== false) {
                    $this->additional['hosts']++;
                }

                if (strpos($fullText, 'EMERGENCY') !== false) {
                    $this->additional['EMERGENCY']++;
                }
            }

            $this->returnJson = $return;

            if (!$this->additional['normal']) {
                $this->additional['normal'] = $this->additional['infoWarnings'] + $this->additional['infoCritical'];
            }
        }
    }
    private function filterBySearch() {
        $search = $this->returnSearch();

        if ($search) {
            $return   = [];
            $keywords = explode(' ', $search);

            foreach ($this->returnJson as $record) {
                $total = count($keywords);
                $match = 0;

                foreach($keywords as $keyword){
                    if (stripos($record['search'], $keyword) !== false) {
                        $match++;
                    }
                }

                if ($total == $match) {
                    $return[] = $record;
                }
            }

            $this->returnJson = $return;
        }
    }
    private function orderRecords() {
        if (!isset($_GET['order']) || !is_array($_GET['order'])) {
            $_GET['order'] = [['column' => 3, 'dir' => 'desc'], ['column' => 5, 'dir' => 'desc']];
        }

        if (count($_GET['order']) == 1) {
            $first  = $this->returnOrder($this->returnJson, 0);

            array_multisort($first, (($_GET['order'][0]['dir'] == 'asc') ? SORT_ASC : SORT_DESC), $this->returnJson);
        }

        if (count($_GET['order']) == 2) {
            $first  = $this->returnOrder($this->returnJson, 1);

            array_multisort($first, (($_GET['order'][0]['dir'] == 'asc') ? SORT_ASC : SORT_DESC), $this->returnJson);
        }

        if (count($_GET['order']) > 2) {
            $first  = $this->returnOrder($this->returnJson, 1);
            $second = $this->returnOrder($this->returnJson, 2);

            array_multisort($first, (($_GET['order'][0]['dir'] == 'asc') ? SORT_ASC : SORT_DESC), SORT_NATURAL | SORT_FLAG_CASE,
                $second, (($_GET['order'][1]['dir'] == 'asc') ? SORT_ASC : SORT_DESC), SORT_NATURAL | SORT_FLAG_CASE,
                $this->returnJson
            );
        }
    }

    private function returnInfoRecord($service, $status) {
        $return = [
            'service' => $service,
            'status'  => $status,
            'info'    => false,
        ];

        if (count($this->infoRecordMark['everywhere']['remove'])) {
            foreach ($this->infoRecordMark['everywhere']['remove'] as $item) {
                if ($match = $this->infoPregMatch($item, $return['service'], false, true)) {
                    $return['service'] = $match;
                    $return['info']    = true;
                }
                if ($match = $this->infoPregMatch($item, $return['status'], false, true)) {
                    $return['status'] = $match;
                    $return['info']   = true;
                }
            }
        }
        if (count($this->infoRecordMark['everywhere']['leave'])) {
            foreach ($this->infoRecordMark['everywhere']['leave'] as $item) {
                if ($this->infoPregMatch($item, $return['service'], false, false) || $this->infoPregMatch($item, $return['status'], false, false)) {
                    $return['info'] = true;
                }
            }
        }

        if (count($this->infoRecordMark['begin']['remove'])) {
            foreach ($this->infoRecordMark['begin']['remove'] as $item) {
                if ($match = $this->infoPregMatch($item, $return['service'], true, true)) {
                    $return['service'] = $match;
                    $return['info']    = true;
                }
                if ($match = $this->infoPregMatch($item, $return['status'], true, true)) {
                    $return['status'] = $match;
                    $return['info']   = true;
                }
            }
        }
        if (count($this->infoRecordMark['begin']['leave'])) {
            foreach ($this->infoRecordMark['begin']['leave'] as $item) {
                if ($this->infoPregMatch($item, $return['service'], true, false) || $this->infoPregMatch($item, $return['status'], true, false)) {
                    $return['info'] = true;
                }
            }
        }

        return $return;
    }
    private function infoPregMatch($marker, $subject, $start = false, $remove = false) {
        $return  = '';
        $pattern = '/'. (($start) ? '^' : '') . $marker .'/';

        if (preg_match($pattern, $subject)) {
            if ($remove) {
                if ($start) {
                    $return = substr($subject, mb_strlen($marker));
                } else {
                    $return = str_replace($marker, '', $subject);
                }
            } else {
                $return = $subject;
            }
        }

        return $return;
    }
    private function duration($seconds, $withSeconds = true) {
        $d   = floor($seconds / 86400);
        $h   = floor(($seconds - $d * 86400) / 3600);
        $m   = floor(($seconds - $d * 86400 - $h * 3600) / 60);
        $s   = $seconds - $d * 86400 - $h * 3600 - $m * 60;
        $out = "{$d}d {$h}h {$m}m";
        $out.= ($withSeconds) ? " {$s}s" : "";
        return $out;
    }
    private function implode_r($item) {
        if (is_array($item)) {
            $results = [];

            foreach ($item as $value) {
                if (is_array($value)) {
                    foreach ($value as $sub) {
                        $results[] = $sub;
                    }
                } else {
                    $results[] = $value;
                }
            }

            return implode(' ', $results);
        }

        return $item;
    }
    private function returnOrder($data, $order) {
        $return = [];

        foreach ($data as $key => $row) {
            if ($_GET['order'][$order]['column'] == 1) {
                $return[$key] = $row['host']['name'];
            } else if ($_GET['order'][$order]['column'] == 2) {
                $return[$key] = $row['service']['name'];
            } else if ($_GET['order'][$order]['column'] == 3) {
                $return[$key] = intval($row['status']['order']);
            } else if ($_GET['order'][$order]['column'] == 4) {
                $return[$key] = intval($row['last']['order']);
            } else if ($_GET['order'][$order]['column'] == 5) {
                $return[$key] = intval($row['duration']['order']);
            } else if ($_GET['order'][$order]['column'] == 6) {
                $return[$key] = $row['info'];
            } else {
                $return[$key] = $row['comment']['ack'];
            }
        }

        return $return;
    }

    private function returnFilter() {
        $filter = (isset($_GET['filter'])) ? $_GET['filter'] : '';
        $filter = ($filter && in_array($filter, ['EMERGENCY', 'normal', 'acked', 'sched', 'hosts'])) ? $filter : 'normal';
        $filter = ($filter == 'EMERGENCY') ? $filter : ('__'. $filter .'__');

        return $filter;
    }
    private function returnSearch() {
        $search = (isset($_GET['xsearch']) && $_GET['xsearch']) ? $_GET['xsearch'] : '';
        $search = (trim($search)) ? trim($search) : '';

        return $search;
    }
}