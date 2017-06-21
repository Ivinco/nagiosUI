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
    public $templates;
    public $nagiosPipe;

    function __construct()
    {
        global $plannedUrl;
        global $plannedTemplates;
        global $nagiosPipe;

        $this->file       = $plannedUrl;
        $this->templates  = $plannedTemplates;
        $this->nagiosPipe = $nagiosPipe;
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
    public function findPlannedRecords($host, $service, $acked, $tempCommen, $hostOrService, $tempSchedCommen) {
        if ($tempSchedCommen != 'planned') {
            if ($planned = $this->findPlannedRecord($host, $service)) {
                $return = [
                    'acked'           => $acked,
                    'tempCommen'      => $tempCommen,
                    'sched'           => 1,
                    'plannedAuthor'   => '',
                    'tempSchedCommen' => 'planned',
                ];

                if ($acked && $tempCommen == 'temp') {
                    $this->unAckForPlanned($host, $service, $hostOrService);
                    $return['acked']      = 0;
                    $return['tempCommen'] = '';
                }

                if ($planned != 'plan') {
                    $return['plannedAuthor'] = md5(strtolower(trim($planned)));
                }

                if ($planned == 'plan' && $author = $this->setPlanned($host, $service)) {
                    $return['plannedAuthor'] = md5(strtolower(trim($author)));
                }

                return $return;
            }
        }

        return [];
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
                    if (preg_match("/$commandHost/iu", $host) && preg_match("/$commandService/iu", $service) && $plan['end'] > time()) {
                        if (isset($plan['list']) && isset($plan['list'][$host]) && isset($plan['list'][$host][$service])) {
                            return $plan['user'];
                        }

                        return 'plan';
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
                    if (preg_match("/$commandHost/iu", $host) && preg_match("/$commandService/iu", $service) && $plan['end'] > time()) {
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
                        $this->schedulePlanned($host, $service, $plan['end'], $plan['user']);

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
    private function schedulePlanned($host, $service, $end, $user) {
        $f = fopen($this->nagiosPipe, 'w');
        fwrite($f, "[".time()."] SCHEDULE_SVC_DOWNTIME;{$host};{$service};".time().";{$end};1;0;1;{$user};planned\n");
        fclose($f);

        return true;
    }
    public function unAckForPlanned($host, $service, $hostOrService) {
        $f = fopen($this->nagiosPipe, 'w');

        if ($hostOrService == 'service') {
            fwrite($f, "[".time()."] REMOVE_SVC_ACKNOWLEDGEMENT;{$host};{$service}\n");
        } else if ($hostOrService == 'host') {
            fwrite($f, "[".time()."] REMOVE_HOST_ACKNOWLEDGEMENT;{$host}\n");
        }

        fclose($f);

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
        $delete          = explode('___', $delete);
        $hostCommand     = $this->returnPlannedPattern($delete[0]);
        $serviceCommand  = $this->returnPlannedPattern($delete[1]);
        $hostCommands    = explode(',', $hostCommand);
        $serviceCommands = explode(',', $serviceCommand);
        $array           = json_decode(json_encode(simplexml_load_string(returnMemcacheData(false))),TRUE);

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
                            if (preg_match("/$commandHost/iu", $host) && preg_match("/$commandService/iu", $service)) {
                                $this->removeSchedulePlanned($downtime);
                            }
                        }
                    }
                }
            }
        }
    }
    private function removeSchedulePlanned($downtimeId) {
        $f = fopen($this->nagiosPipe, 'w');
        fwrite($f, "[".time()."] DEL_SVC_DOWNTIME;{$downtimeId}\n");
        fclose($f);
    }
}
