<?php

include_once 'functions.php';

if (!isset($_SESSION)) {
    session_start();
}

ignore_user_abort(false);
set_time_limit(10);

if (connection_aborted()) {
    http_response_code(404);
    die;
}

if (isset($_GET['returndate'])) {
    echo "Last Updated: " . date('D M j H:i:s T Y');
    http_response_code(200);
    die;
}

ob_start('ob_gzhandler');
header('Content-Type: application/json');

global $usersArray;
global $commentsSelect;

$xmlFile     = (isset($_GET['file'])) ? $_GET['file'] : '';
$array       = json_decode(json_encode(simplexml_load_string(returnMemcacheData($xmlFile))),TRUE);
$returnJson  = array();
$user        = (isset($_SESSION["currentUser"]) && $_SESSION["currentUser"]) ? $_SESSION["currentUser"] : 'default';
$ac          = new accessControl;
$plannedData = new planned;

if (!$array) {
    http_response_code(404);
    die;
}

if (isset($array['alert']['host'])) {
    $array['alert'] = [$array['alert']];
}

foreach ($array['alert'] as $item) {
    $acked           = (!is_array($item['acked']))                ? $item['acked']                : implode(' ', $item['acked']);
    $ackComment      = (!is_array($item['ack_comment']))          ? $item['ack_comment']          : implode(' ', $item['ack_comment']);
    $sched           = (!is_array($item['sched']))                ? $item['sched']                : implode(' ', $item['sched']);
    $schComment      = (!is_array($item['sched_comment']))        ? $item['sched_comment']        : implode(' ', $item['sched_comment']);
    $host            = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
    $hostUrl         = (!is_array($item['host-url']))             ? $item['host-url']             : implode(' ', $item['host-url']);
    $service         = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
    $serviceUrl      = (!is_array($item['service-url']))          ? $item['service-url']          : implode(' ', $item['service-url']);
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
    $tempSchedAuthor = (!is_array($item['sched_last_author']))    ? $item['sched_last_author']    : implode(' ', $item['sched_last_author']);
    $tempSchedCommen = (!is_array($item['sched_last_temp']))      ? $item['sched_last_temp']      : implode(' ', $item['sched_last_temp']);
    $quickAckAu      = (!is_array($item['quick_ack_author']))     ? $item['quick_ack_author']     : implode(' ', $item['quick_ack_author']);
    $plannedAuthor   = (!is_array($item['planned_author']))       ? $item['planned_author']       : implode(' ', $item['planned_author']);
    $schedStart      = (!is_array($item['sched_start']))          ? $item['sched_start']          : implode(' ', $item['sched_start']);
    $schedEnd        = (!is_array($item['sched_end']))            ? $item['sched_end']            : implode(' ', $item['sched_end']);
    $schedDuration   = (!is_array($item['sched_duration']))       ? $item['sched_duration']       : implode(' ', $item['sched_duration']);
    $pending         = (!is_array($item['pending']))              ? $item['pending']              : implode(' ', $item['pending']);
    $pending         = intval($pending);
    $nextCheck       = (!is_array($item['next_check']))           ? $item['next_check']           : implode(' ', $item['next_check']);
    $nextCheck       = intval($nextCheck);
    $hostOrService   = $item['host_or_service'];
    $plannedComment  = ['', ''];
    $isPlanned       = false;
    $showInNormal    = false;
    $schedPlanned    = true;

    if (!$ac->verifyUser($service, $user)) {
        continue;
    }

    $infoRecord = returnInfoRecord($service, $statusInfo);

    if (!$xmlFile && !$infoRecord['info'] && $plannedRecord = $plannedData->findPlannedRecords($host, $service, $acked, $tempCommen, $hostOrService, $sched, $schComment)) {
        $sched          = $plannedRecord['sched'];
        $schComment     = $plannedRecord['comment'];
        $acked          = $plannedRecord['acked'];
        $tempCommen     = $plannedRecord['tempCommen'];
        $plannedAuthor  = $plannedRecord['avatar'];
        $isPlanned      = true;
        $schedPlanned   = $plannedRecord['scheduled'];
        $showInNormal   = $plannedRecord['normal'];
        $plannedComment = [$plannedRecord['command'], $plannedRecord['commentRaw']];
        $schedEnd       = $plannedRecord['end'];
    }

    $returnType = '';
    $returnType.= ((!$acked && !$sched) || ($acked && $tempCommen == 'temp') || $infoRecord['info'] || $showInNormal) ? '__normal__' : '';
    $returnType.= ($acked && $tempCommen != 'temp' && !$infoRecord['info']) ? '__acked__' : '';
    $returnType.= ($sched && !$infoRecord['info']) ? '__sched__' : '';

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

    $returnJson[] = array(
        'host'      => array(
            'name'  => $host,
            'url'   => $hostUrl,
            'host'  => $hostOrService,
            ),
        'service'   => array(
            'name'  => $service,
            'url'   => $serviceUrl,
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
        ),
        'status'    => array(
            'name'  => $statusName,
            'order' => ($state == 'CRITICAL') ? 4 : (($state == 'UNKNOWN') ? 3 : (($state == 'WARNING') ? 2 : (($state == 'OK') ? 1 : 0))),
            ),
        'last'      => array(
            'name'  => ($pending) ? '' : $lastCheck,
            'order' => $lastCheckS,
            ),
        'duration'  => array(
            'name'  => ($pending) ? '' : $duration,
            'order' => $durationS,
            'lastCheck' => duration(time() - $lastCheckS, false),
            'end'   => duration($schedEnd - time(), false),
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

$additional = array(
    'nagiosConfigFile'  => $array['nagios-config-file'],
    'nagiosFullListUrl' => $array['nagios-full-list-url'],
    'updateHash'        => $array['hash'],
    'groupByService'    => $array['group-by-service'],
    'groupByHost'       => $array['group-by-host'],
    'refreshArray'      => $array['refresh-array'],
    'normal'            => 0,
    'acked'             => 0,
    'sched'             => 0,
    'EMERGENCY'         => 0,
    'warnings'          => 0,
    'critical'          => 0,
    'unknown'           => 0,
    'total'             => count($returnJson),
    'commentsSelect'    => $commentsSelect,
    'nagiosCommentUrl'  => $array['nagios-comment-url'],
);

$filter = (isset($_GET['filter'])) ? $_GET['filter'] : '';
$filter = ($filter && in_array($filter, ['EMERGENCY', 'normal', 'acked', 'sched'])) ? $filter : 'normal';

if ($filter) {
    $return = [];
    $filter = ($filter == 'EMERGENCY') ? $filter : ('__'. $filter .'__');

    foreach ($returnJson as $record) {
        $fullText = implode_r(' ', $record);

        if (strpos($fullText, $filter) !== false) {
            $return[] = $record;
        }

        if (strpos($fullText, '__normal__') !== false && strpos($fullText, '__info__') === false) {
            $additional['normal']++;

            if ($record['status']['name'] == 'WARNING') {
                $additional['warnings']++;
            }

            if ($record['status']['name'] == 'CRITICAL') {
                $additional['critical']++;
            }

            if ($record['status']['name'] == 'UNKNOWN') {
                $additional['unknown']++;
            }
        }

        if (strpos($fullText, '__acked__') !== false) {
            $additional['acked']++;
        }

        if (strpos($fullText, '__sched__') !== false) {
            $additional['sched']++;
        }

        if (strpos($fullText, 'EMERGENCY') !== false) {
            $additional['EMERGENCY']++;
        }
    }

    $returnJson = $return;
}

if (isset($_GET['search']) && isset($_GET['search']['value']) && $_GET['search']['value']) {
    $return = [];

    $keywords = explode(' ', trim($_GET['search']['value']));

    foreach ($returnJson as $record) {
        $total = count($keywords);
        $match = 0;

        foreach($keywords as $keyword){
            if (strpos($record['search'], $keyword) !== false) {
                $match++;
            }
        }

        if ($total == $match) {
            $return[] = $record;
        }
    }

    $returnJson = $return;
}


if (!isset($_GET['order']) || !is_array($_GET['order'])) {
    $_GET['order'] = [['column' => 2, 'dir' => 'desc'], ['column' => 4, 'dir' => 'desc']];
}

if (count($_GET['order']) == 1) {
    $first  = returnOrder($returnJson, 0);

    array_multisort($first, (($_GET['order'][0]['dir'] == 'asc') ? SORT_ASC : SORT_DESC), $returnJson);
}

if (count($_GET['order']) > 1) {
    $first  = returnOrder($returnJson, 0);
    $second = returnOrder($returnJson, 1);

    array_multisort($first, (($_GET['order'][0]['dir'] == 'asc') ? SORT_ASC : SORT_DESC), SORT_NATURAL | SORT_FLAG_CASE,
                    $second, (($_GET['order'][1]['dir'] == 'asc') ? SORT_ASC : SORT_DESC), SORT_NATURAL | SORT_FLAG_CASE,
                    $returnJson
    );
}

$additional['total_tab'] = count($returnJson);

echo json_encode(array('data' => $returnJson, 'additional' => $additional));

http_response_code(200);
die;


function returnOrder($data, $order) {
    $return = [];

    foreach ($data as $key => $row) {
        if ($_GET['order'][$order]['column'] == 0) {
            $return[$key] = $row['host']['name'];
        } else if ($_GET['order'][$order]['column'] == 1) {
            $return[$key] = $row['service']['name'];
        } else if ($_GET['order'][$order]['column'] == 2) {
            $return[$key] = intval($row['status']['order']);
        } else if ($_GET['order'][$order]['column'] == 3) {
            $return[$key] = intval($row['last']['order']);
        } else if ($_GET['order'][$order]['column'] == 4) {
            $return[$key] = intval($row['duration']['order']);
        } else if ($_GET['order'][$order]['column'] == 5) {
            $return[$key] = $row['info'];
        } else {
            $return[$key] = $row['comment']['ack'];
        }
    }

    return $return;
}

function returnInfoRecord($service, $status) {
    global $infoRecordMark;

    $return = [
        'service' => $service,
        'status'  => $status,
        'info'    => false,
    ];

    if (count($infoRecordMark['everywhere']['remove'])) {
        foreach ($infoRecordMark['everywhere']['remove'] as $item) {
            if ($match = infoPregMatch($item, $return['service'], false, true)) {
                $return['service'] = $match;
                $return['info']    = true;
            }
            if ($match = infoPregMatch($item, $return['status'], false, true)) {
                $return['status'] = $match;
                $return['info']   = true;
            }
        }
    }
    if (count($infoRecordMark['everywhere']['leave'])) {
        foreach ($infoRecordMark['everywhere']['leave'] as $item) {
            if (infoPregMatch($item, $return['service'], false, false) || infoPregMatch($item, $return['status'], false, false)) {
                $return['info'] = true;
            }
        }
    }

    if (count($infoRecordMark['begin']['remove'])) {
        foreach ($infoRecordMark['begin']['remove'] as $item) {
            if ($match = infoPregMatch($item, $return['service'], true, true)) {
                $return['service'] = $match;
                $return['info']    = true;
            }
            if ($match = infoPregMatch($item, $return['status'], true, true)) {
                $return['status'] = $match;
                $return['info']   = true;
            }
        }
    }
    if (count($infoRecordMark['begin']['leave'])) {
        foreach ($infoRecordMark['begin']['leave'] as $item) {
            if (infoPregMatch($item, $return['service'], true, false) || infoPregMatch($item, $return['status'], true, false)) {
                $return['info'] = true;
            }
        }
    }

    return $return;
}
function infoPregMatch($marker, $subject, $start = false, $remove = false) {
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