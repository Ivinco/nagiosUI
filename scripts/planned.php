<?php

class planned
{
    public $host;
    public $service;
    public $comment;
    public $time;
    public $line;
    public $user;
    public $file;
    public $normal;
    public $templates;
    public $nagiosPipe;
    public $usersArray;
    public $nagiosCommentUrl;

    function __construct()
    {
        global $plannedUrl;
        global $plannedTemplates;
        global $nagiosPipe;
        global $usersArray;
        global $nagiosCommentUrl;

        $this->file             = $plannedUrl;
        $this->templates        = $plannedTemplates;
        $this->nagiosPipe       = $nagiosPipe;
        $this->usersArray       = $usersArray;
        $this->nagiosCommentUrl = $nagiosCommentUrl;
        $this->actions          = new actions;
    }

    public function verifyPostData() {
        if ((!$this->host && !$this->service) || !$this->comment || !$this->line || !$this->user || $this->time < 1) {
            return true;
        }

        return false;
    }
    public function addData() {
        $json = $this->returnPlanned();

        if ($this->line == 'new') {
            $end = (time() + $this->time * 60);

            $json[] = [
                'host'    => $this->host,
                'service' => $this->service,
                'comment' => $this->comment,
                'time'    => $this->time,
                'end'     => $end,
                'date'    => date('Y-m-d H:i:s', $end),
                'user'    => $this->user,
                'normal'  => $this->normal,
            ];
        }

        $this->writePlanned($json);
    }
    public function returnPlanned() {
        return json_decode(file_get_contents($this->file), true);
    }
    private function writePlanned($data) {
        file_put_contents($this->file, json_encode($data, true));
    }
    public function recheckData() {
        $json = $this->returnPlanned();

        $results = [];

        foreach ($json as $record) {
            if ($record['end'] > time()) {
                $results[] = $record;
            }
        }

        $this->writePlanned($results);

        print_r(json_encode(['file' => $results, 'templates' => $this->templates], true));
    }
    public function editData($id) {
        $json    = $this->returnPlanned();
        $results = [];

        foreach ($json as $key => $record) {
            if (($record['host'] . '___' . $record['service']) == $id) {
                $record['host']    = $this->host;
                $record['service'] = $this->service;
                $record['comment'] = $this->comment;
                $record['normal']  = $this->normal;
            }

            $results[] = $record;
        }

        $this->writePlanned($results);
    }
    public function removeData() {
        $json    = $this->returnPlanned();
        $results = [];
        $delete  = null;

        foreach ($json as $key => $record) {
            if ($record['end'] > time() && ($record['host'] . '___' . $record['service']) != $this->line) {
                $results[] = $record;
            }

            if ($record['end'] > time() && ($record['host'] . '___' . $record['service']) == $this->line) {
                $delete = $this->line;
            }
        }

        $this->removePlannedMaintenance($delete);
        $this->writePlanned($results);
    }
    public function findPlannedRecords($host, $service, $acked, $tempCommen, $hostOrService, $sched, $schComment) {
        $return = [];

        if ($planned = $this->findPlannedRecord($host, $service)) {
            if ($planned['type'] == 'new' && !$sched) {
                $this->setPlanned($host, $service);
            }

            $return = [
                'acked'      => $acked,
                'tempCommen' => $tempCommen,
                'author'     => $planned['author'],
                'avatar'     => md5(strtolower(trim($planned['email']))),
                'commentRaw' => ($sched) ? strip_tags(explode("'", $schComment)[1]) : $planned['comment'],
                'comment'    => ($sched) ? $schComment : $this->formatScheduledComment($planned['comment'], $planned['author'], $planned['date']),
                'date'       => $planned['date'],
                'normal'     => $planned['normal'],
                'command'    => $planned['command'],
                'end'        => $planned['end'],
                'scheduled'  => ($sched) ? true : false,
                'sched'      => (!$sched) ? 1 : $sched,
            ];

            if ($acked && $tempCommen == 'temp') {
                $this->unAckForPlanned($host, $service, $hostOrService);
                $return['acked']      = 0;
                $return['tempCommen'] = '';
            }
        }

        return $return;
    }
    public function formatScheduledComment($comment, $author, $time) {
        $return  = preg_replace('/(#(\d+))/', $this->nagiosCommentUrl, $comment);
        $return  = "'{$return}' by {$author}";
        $return .= ($time) ? '<br />added: '. date('M j H:i', intval($time)) : '';

        return $return;
    }
    public function findPlannedRecord($host, $service) {
        $planned = $this->returnPlanned();

        foreach ($planned as $key => $plan) {
            $hostCommand     = $this->returnPlannedPattern($plan['host']);
            $serviceCommand  = $this->returnPlannedPattern($plan['service']);
            $hostCommands    = explode(',', $hostCommand);
            $serviceCommands = explode(',', $serviceCommand);

            foreach ($hostCommands as $commandHost) {
                foreach ($serviceCommands as $commandService) {
                    if (preg_match("/$commandHost/iu", " " . $host . " ") && preg_match("/$commandService/iu", " " . $service . " ") && $plan['end'] > time()) {
                        $type = (isset($plan['list']) && isset($plan['list'][$host]) && isset($plan['list'][$host][$service])) ? 'old' : 'new';

                        return [
                            'type'    => $type,
                            'author'  => $plan['user'],
                            'email'   => $this->usersArray[$plan['user']],
                            'comment' => $plan['comment'],
                            'date'    => ($type == 'old') ? $plan['list'][$host][$service] : time(),
                            'normal'  => $plan['normal'],
                            'command' => $plan['host'] . '___' . $plan['service'],
                            'end'     => $plan['end'],
                        ];
                    }
                }
            }
        }

        return '';
    }
    private function setPlanned($host, $service) {
        $planned = $this->returnPlanned();

        foreach ($planned as $key => $plan) {
            $hostCommand     = $this->returnPlannedPattern($plan['host']);
            $serviceCommand  = $this->returnPlannedPattern($plan['service']);
            $hostCommands    = explode(',', $hostCommand);
            $serviceCommands = explode(',', $serviceCommand);

            foreach ($hostCommands as $commandHost) {
                foreach ($serviceCommands as $commandService) {
                    if (preg_match("/$commandHost/iu", " " . $host . " ") && preg_match("/$commandService/iu", " " . $service . " ") && $plan['end'] > time()) {
                        $results = [];

                        foreach ($planned as $plannedKey => $plannedValue) {
                            $results[$plannedKey] = $plannedValue;

                            if ($key == $plannedKey) {
                                if (!isset($plan['list'])) {
                                    $results[$plannedKey]['list'] = [];
                                }

                                if (!isset($plan['list'][$host])) {
                                    $results[$plannedKey]['list'][$host] = [];
                                }

                                if (!isset($plan['list'][$host][$service])) {
                                    $results[$plannedKey]['list'][$host][$service] = '';
                                }

                                $results[$plannedKey]['list'][$host][$service] = time() + 10;
                            }
                        }

                        $this->writePlanned($results);
                        $this->schedulePlanned($host, $service, $plan['end'], $plan['user'], $plan['comment']);

                        return $plan['user'];
                    }
                }
            }
        }

        return '';
    }
    private function returnPlannedPattern($pattern) {
        $pattern = trim($pattern);
        $pattern = ($pattern) ? $pattern : '*';
        $pattern = str_replace("*", ".+", $pattern);
        $pattern = str_replace("?", ".", $pattern);
        $pattern = str_replace("&quot;", "\"", $pattern);
        $pattern = str_replace(".+.+", ".+", $pattern);

        return $pattern;
    }
    private function schedulePlanned($host, $service, $end, $user, $comment) {
        $this->actions->setType('scheduleItTime');
        $this->actions->runActions([[
            'start_time' => time(),
            'end_time'   => $end,
            'hours'      => 1,
            'isHost'     => 'service',
            'host'       => $host,
            'service'    => $service,
            'author'     => $user,
            'com_data'   => $comment,
        ]]);

        return true;
    }
    public function unAckForPlanned($host, $service, $hostOrService) {
        $this->actions->setType('unAcknowledgeIt');
        $this->actions->runActions([[
            'host'    => $host,
            'service' => $service,
            'isHost'  => $hostOrService,
        ]]);

        return true;
    }
    public function returnPlannedComment($host, $service) {
        $planned = $this->returnPlanned();

        foreach ($planned as $key => $plan) {
            $hostCommand     = $this->returnPlannedPattern($plan['host']);
            $serviceCommand  = $this->returnPlannedPattern($plan['service']);
            $hostCommands    = explode(',', $hostCommand);
            $serviceCommands = explode(',', $serviceCommand);

            foreach ($hostCommands as $commandHost) {
                foreach ($serviceCommands as $commandService) {
                    if (preg_match("/$commandHost/iu", $host) && preg_match("/$commandService/iu", $service) && $plan['end'] > time() && isset($plan['comment'])) {
                        return [$plan['host'] . '___' . $plan['service'], $plan['comment']];
                    }
                }
            }
        }

        return '';
    }
    public function changeComment() {
        $json    = $this->returnPlanned();
        $results = [];

        foreach ($json as $key => $record) {
            if (($record['host'] . '___' . $record['service']) == $this->line) {
                $record['comment'] = $this->comment;
            }

            $results[] = $record;
        }

        $this->writePlanned($results);
    }
    public function removePlannedMaintenance($delete) {
        $xml             = new xml;
        $delete          = explode('___', $delete);
        $hostCommand     = $this->returnPlannedPattern($delete[0]);
        $serviceCommand  = $this->returnPlannedPattern($delete[1]);
        $hostCommands    = explode(',', $hostCommand);
        $serviceCommands = explode(',', $serviceCommand);
        $array           = json_decode(json_encode(simplexml_load_string($xml->returnXml(false, false))),TRUE);

        if (isset($array['alert']['host'])) {
            $array['alert'] = [$array['alert']];
        }

        foreach ($array['alert'] as $item) {
            $tempSchedCommen = (!is_array($item['sched_last_temp']))      ? $item['sched_last_temp']      : implode(' ', $item['sched_last_temp']);
            $host            = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
            $service         = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
            $downtimeId      = (!is_array($item['downtime_id']))          ? $item['downtime_id']          : implode(',', $item['downtime_id']);
            $downtimeId      = explode(',', $downtimeId);

            foreach ($downtimeId as $downtime) {
                if ($tempSchedCommen == 'planned' && $downtimeId != 4) {
                    foreach ($hostCommands as $commandHost) {
                        foreach ($serviceCommands as $commandService) {
                            if (preg_match("/$commandHost/iu", " " . $host . " ") && preg_match("/$commandService/iu", " " . $service . " ")) {
                                $this->removeSchedulePlanned($downtime);
                            }
                        }
                    }
                }
            }
        }
    }
    private function removeSchedulePlanned($downtimeId) {
        $this->actions->setType('downtime');
        $this->actions->runActions([[
            'down_id' => $downtimeId,
            'isHost'  => 'service',
        ]]);

        return true;
    }
}
