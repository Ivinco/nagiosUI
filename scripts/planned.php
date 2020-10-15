<?php

class planned
{
    public $host;
    public $service;
    public $status;
    public $comment;
    public $time;
    public $line;
    public $user;
    public $file;
    public $normal;
    public $server;
    public $xserver;
    public $postServer;

    function __construct()
    {
        global $serversList;

        $this->serversList = $serversList;
        $this->actions     = new actions;
        $this->db          = new db;
        $this->utils       = new utils();
        $this->removeAlerts = [];
        $this->addAlerts    = [];
        $this->memcache     = $this->utils->getMemcache();
    }

    public function verifyPostData() {
        if ((!$this->host && !$this->service && !$this->status) || !$this->comment || !$this->line || !$this->user || $this->time < 1) {
            return true;
        }

        return false;
    }
    public function addData() {
        if ($this->line == 'new') {
            $end = (time() + $this->time * 60);
            $server = ($this->xserver) ? $this->xserver : $this->server;

            $this->db->addNewPlanned($this->host, $this->service, $this->status, $this->comment, $this->time, $end, date('Y-m-d H:i:s', $end), $this->user, $this->normal, $server);
            $this->logToDb($this->host, $this->service, $this->status, date('Y-m-d H:i:s', $end), $this->user, $this->comment, true);
        }
    }
    private function logToDb($host, $service, $status, $till, $author, $comment, $add)
    {
        $text = [];

        if ($host) {
            $text[] = 'host: ' . $host;
        }

        if ($service) {
            $text[] = 'service: ' . $service;
        }

        if ($status) {
            $text[] = 'status information: ' . $status;
        }

        if ($till) {
            $text[] = 'till: ' . $till;
        }

        if ($comment) {
            $text[] = 'comment: ' . $comment;
        }

        $text = implode(', ', $text);
        $text = $author . ': ' . (($add) ? 'added' : 'removed' ) . ' planned downtime on ' . $text;

        $data = [
            'host' => $host,
            'service' => $service,
            'author' => $author,
            'comment' => $text,
        ];

        $this->db->logAction($data, 'planned', $this->server);
    }
    public function returnPlannedCount() {
        return count($this->db->returnPlanned($this->server));
    }
    public function recheckData() {
        $this->db->deleteOldPlanned($this->server);
        $json = $this->db->returnPlanned($this->server);
        $templates = $this->db->plannedTemplatesList($this->server);
        $serversList = array_keys($this->serversList);
        $serversList[] = 'All';

        sort($serversList);

        print_r(json_encode(['file' => $json, 'templates' => $templates, 'servers' => implode(',', $serversList)], true));
    }
    public function editData($id) {
        $time = null;
        $end  = null;
        $date = null;

        if ($this->time > 1) {
            $time = $this->time;
            $end  = (time() + $time * 60);
            $date = date('Y-m-d H:i:s', $end);
        }

        $this->db->editPlanned($id, $this->host, $this->service, $this->status, $this->comment, $this->normal, $this->postServer, $time, $end, $date);
    }
    public function removeData() {
        $this->removeAlerts = [];
        $record = $this->db->returnPlannedRecord($this->line, $this->server);
        $this->logToDb($record['host'], $record['service'], $record['status'], $record['date'], $this->user, $record['comment'], false);
        $this->db->removePlanned($this->line, $this->server);
        $this->removePlannedMaintenance($this->line);
        $this->removeMultiSchedulePlanned();
    }
    public function findPlannedRecords($host, $service, $status, $hostOrService, $sched, $schComment, $downtimeId, $server) {
        $return = [];

        if ($service != 'FULL HOSTS LIST' && $planned = $this->findPlannedRecord($host, $service, $status)) {
            $planned = end($planned);

            list($schComment, $downtimeId) = $this->removeNonPlannedComments($schComment, $downtimeId);

            $sched = ($schComment) ? 1 : 0;

            if (($planned['type'] == 'new' && $this->returnRawComment($schComment) != $planned['comment'] || !$sched)) {
                if ($downtimeId) {
                    foreach (explode(',', $downtimeId) as $downtime) {
                        $this->addToRemoveAlert($server, $downtime);
                    }

                    $sched = 0;
                }

                $this->setPlanned($host, $service, $status, $hostOrService, $server);
            }

            $return = [
                'author'     => $planned['author'],
                'avatar'     => md5(strtolower(trim($planned['email']))),
                'commentRaw' => ($sched) ? $this->returnRawComment($schComment) : $planned['comment'],
                'comment'    => ($sched && $planned['comment'] != $this->returnRawComment($schComment)) ? $schComment : $this->formatScheduledComment($planned['comment'], $planned['author'], $planned['date'], $server),
                'date'       => $planned['date'],
                'normal'     => $planned['normal'],
                'command'    => $planned['command'],
                'end'        => $planned['end'],
                'scheduled'  => true,
                'sched'      => 1,
            ];
        }

        return $return;
    }
    private function removeNonPlannedComments($schComment, $downtimeId) {
        $schComment = explode('<br /><br />', $schComment);
        $downtimeId = explode(',', $downtimeId);

        $comments  = [];
        $downtimes = [];

        foreach ($schComment as $key => $value) {
            $comment = $this->returnRawComment($value);

            if (substr($comment, 0, 9) == '(planned)') {
                $comments[]  = str_replace('(planned)', '', $value);
                $downtimes[] = $downtimeId[$key];
            }
        }

        return [implode('<br /><br />', $comments), implode(',', $downtimes)];
    }
    public function formatScheduledComment($comment, $author, $time, $server) {
        $return  = $this->utils->parseUrls($comment, $server);
        $return  = "'{$return}' by {$author}";
        $return .= ($time) ? '<br />added: '. date('M j H:i', intval($time)) : '';

        return $return;
    }
    private function returnRawComment($comment) {
        if ($comment) {
            $comment = explode("'", $comment);

            if (isset($comment[1])) {
                return strip_tags($comment[1]);
            }
        }

        return '';
    }
    public function findPlannedRecord($host, $service, $status) {
        $planned = $this->db->returnPlanned($this->server);
        $usersArray = $this->db->usersList($this->server);
        $return  = [];

        if (!is_array($planned)) {
            return $return;
        }

        foreach ($planned as $key => $plan) {
            $hostCommand     = $this->returnPlannedPattern($plan['host']);
            $serviceCommand  = $this->returnPlannedPattern($plan['service']);
            $statusCommand   = $this->returnPlannedPattern($plan['status']);
            $hostCommands    = explode(',', $hostCommand);
            $serviceCommands = explode(',', $serviceCommand);
            $statusCommands  = explode(',', $statusCommand);

            foreach ($hostCommands as $commandHost) {
                foreach ($serviceCommands as $commandService) {
                    foreach ($statusCommands as $commandStatus) {
                        if ($this->pregMatchHost($commandHost, $host) && $this->pregMatchService($commandService, $service) && $this->pregMatchStatus($commandStatus, $status) && $plan['end'] > time()) {
                            $type = (isset($plan['list']) && isset($plan['list'][$host]) && isset($plan['list'][$host][$service]) && isset($plan['list'][$host][$service][$status]) && time() < $plan['list'][$host][$service][$status]) ? 'old' : 'new';

                            $return[] = [
                                'type'    => $type,
                                'author'  => $plan['user'],
                                'email'   => $usersArray[$plan['user']],
                                'comment' => $plan['comment'],
                                'date'    => ($type == 'old') ? $plan['list'][$host][$service][$status] : time(),
                                'normal'  => $plan['normal'],
                                'command' => $plan['host'] . '___' . $plan['service'] . '___' . $plan['status'],
                                'end'     => $plan['end'],
                                'key'     => $key,
                            ];
                        }
                    }
                }
            }
        }

        return $return;
    }
    private function setPlanned($host, $service, $status, $hostOrService, $server) {
        $planned = $this->db->returnPlanned($this->server);
        $return  = $this->findPlannedRecord($host, $service, $status);

        if ($return) {
            $return  = end($return);
            $results = [];

            if (is_array($planned)) {
                foreach ($planned as $plannedKey => $plannedValue) {
                    $results[$plannedKey] = $plannedValue;

                    if ($return['key'] == $plannedKey) {
                        if (!isset($plan['list'])) {
                            $results[$plannedKey]['list'] = [];
                        }

                        if (!isset($plan['list'][$host])) {
                            $results[$plannedKey]['list'][$host] = [];
                        }

                        if (!isset($plan['list'][$host][$service])) {
                            $results[$plannedKey]['list'][$host][$service] = [];
                        }

                        if (!isset($plan['list'][$host][$service][$status])) {
                            $results[$plannedKey]['list'][$host][$service][$status] = '';
                        }

                        $results[$plannedKey]['list'][$host][$service][$status] = time() + 10;

                        $this->db->editPlannedList($results[$plannedKey]['list'], $host, $service, $status, $server);
                    }
                }

                $this->schedulePlanned($host, $service, $return['end'], $return['author'], $return['comment'], $hostOrService, $server);

                return $return['author'];
            }
        }

        return '';
    }
    private function returnPlannedPattern($pattern) {
        $pattern = trim($pattern);
        $pattern = ($pattern) ? $pattern : '*';
        $pattern = str_replace("?", ".", $pattern);
        $pattern = str_replace("*", ".*?", $pattern);
        $pattern = str_replace("&quot;", "\"", $pattern);
        $pattern = str_replace(".*?.*?", ".*?", $pattern);

        return $pattern;
    }
    private function schedulePlanned($host, $service, $end, $user, $comment, $hostOrService, $server) {
        if ($this->memcache) {
            $downtimeKey   = md5($host . $service . $end . $user . $comment . $hostOrService . $server);
            $alertsList    = [];
            $memcacheName  = $this->utils->getMemcacheFullName($server);
            $memcacheName .= "_add_planned";

            if ($this->memcache->get($memcacheName)) {
                $alertsList  = $this->memcache->get($memcacheName);
                $alertsList  = json_decode($alertsList);

                if (!in_array($downtimeKey, $alertsList)) {
                    $alertsList[] = $downtimeKey;
                    $this->memcache->set($memcacheName, json_encode($alertsList), 0, 120);
                    $this->addToAddAlert($host, $service, $end, $user, $comment, $hostOrService, $server);
                }
            } else {
                $alertsList[] = $downtimeKey;
                $this->memcache->set($memcacheName, json_encode($alertsList), 0, 120);
                $this->addToAddAlert($host, $service, $end, $user, $comment, $hostOrService, $server);
            }
        } else {
            $this->addToAddAlert($host, $service, $end, $user, $comment, $hostOrService, $server);
        }
    }
    private function addToAddAlert($host, $service, $end, $user, $comment, $hostOrService, $server)
    {
        if (!isset($this->addAlerts[$server])) {
            $this->addAlerts[$server] = [];
        }

        $this->addAlerts[$server][] = [
            'start_time' => time(),
            'end_time'   => $end,
            'hours'      => ((int) $end - time()),
            'isHost'     => $hostOrService,
            'host'       => $host,
            'service'    => $service,
            'author'     => $user,
            'com_data'   => '(planned)' . $comment,
            'tab'        => $server,
        ];
    }
    public function changeComment() {
        $this->db->editPlannedComment($this->line, $this->comment, $this->server);
    }
    public function removePlannedMaintenance($delete) {
        $delete          = explode('___', $delete);
        $hostCommand     = $this->returnPlannedPattern($delete[0]);
        $serviceCommand  = $this->returnPlannedPattern($delete[1]);
        $statusCommand   = $this->returnPlannedPattern($delete[2]);
        $hostCommands    = explode(',', $hostCommand);
        $serviceCommands = explode(',', $serviceCommand);
        $statusCommands  = explode(',', $statusCommand);
        $serversList     = ($delete[3] == 'All') ? array_keys($this->serversList) : [$delete[3]];

        foreach ($serversList as $server) {
            $this->server = $server;
            $xml = new xml;
            $xml->setCurrentTab($this->server);

            $array           = json_decode(json_encode(simplexml_load_string($xml->returnXml(false))),TRUE);

            if (isset($array['alert']['host'])) {
                $array['alert'] = [$array['alert']];
            }

            if (!isset($array['alert'])) {
                continue;
            }

            foreach ($array['alert'] as $item) {
                $host       = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
                $service    = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
                $status     = (!is_array($item['status_information']))   ? $item['status_information']   : implode(' ', $item['status_information']);
                $downtimeId = (!is_array($item['downtime_id']))          ? $item['downtime_id']          : implode(',', $item['downtime_id']);
                $schComment = (!is_array($item['sched_comment']))        ? $item['sched_comment']        : implode(' ', $item['sched_comment']);
                $server     = (!is_array($item['tab']))                  ? $item['tab']                  : implode(' ', $item['tab']);

                list($schComment, $downtimeId) = $this->removeNonPlannedComments($schComment, $downtimeId);

                $downtimeId = explode(',', $downtimeId);

                if (isset($downtimeId[0]) && $downtimeId[0]) {
                    foreach ($downtimeId as $downtime) {
                        if ($downtime != 4) {
                            foreach ($hostCommands as $commandHost) {
                                foreach ($serviceCommands as $commandService) {
                                    foreach ($statusCommands as $commandStatus) {
                                        if ($this->pregMatchHost($commandHost, $host) && $this->pregMatchService($commandService, $service) && $this->pregMatchStatus($commandStatus, $status)) {
                                            $this->addToRemoveAlert($server, $downtime);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    private function addToRemoveAlert($server, $downtime)
    {
        if (!isset($this->removeAlerts[$server])) {
            $this->removeAlerts[$server] = [];
        }
        $this->removeAlerts[$server][] = $downtime;
    }
    private function addToRemoveOldAlert($server, $host, $service)
    {
        if (!isset($this->removeAlerts[$server])) {
            $this->removeAlerts[$server] = [];
        }
        $this->removeAlerts[$server][] = [
            'host'    => $host,
            'service' => $service,
        ];
    }

    public function runActionsFromJson()
    {
        $this->removeMultiSchedulePlanned();
        $this->scheduleMultiPlanned();
    }
    private function scheduleMultiPlanned()
    {
        foreach ($this->addAlerts as $server => $alerts) {
            $this->actions->setType('scheduleItTimePlanned');
            $this->actions->setServer($server);
            $this->actions->runActions($alerts);
        }
    }
    private function removeMultiSchedulePlanned()
    {
        foreach ($this->removeAlerts as $server => $alerts) {
            $this->actions->setType('downtimePlanned');
            $this->actions->setServer($server);

            $data = [];

            foreach ($alerts as $alert) {
                $data[] = [
                    'tab'     => $server,
                    'down_id' => $alert,
                    'isHost'  => 'service',
                ];
            }

            $this->actions->runActions($data);
        }
    }
    private function removeMultiScheduleOldPlanned()
    {
        foreach ($this->removeAlerts as $server => $alerts) {
            $this->actions->setType('downtimeOldPlanned');
            $this->actions->setServer($server);
            $this->actions->runActions($alerts);
        }
    }
    private function pregMatchHost($commandHost, $host) {
        return preg_match("/^$commandHost$/iu", $host);
    }
    private function pregMatchService($commandService, $service) {
        return preg_match("/$commandService/iu", " " . $service . " ");
    }
    private function pregMatchStatus($commandStatus, $status) {
        return preg_match("/$commandStatus/iu", " " . $status . " ");
    }

    public function removeOldPlanned()
    {
        $oldPlanned  = $this->db->returnOldPlanned();
        $serversList = array_keys($this->serversList);

        if (!$oldPlanned) {
            return;
        }

        foreach ($serversList as $server) {
            $xml = new xml;
            $xml->setCurrentTab($server);

            $alertsList = $xml->getFullData($server);

            if (!$alertsList) {
                continue;
            }

            foreach ($alertsList as $host => $hostData) {
                foreach ($hostData as $service) {

                    foreach ($oldPlanned as $oldItem) {
                        if (!in_array($oldItem['server'], ['All', $server])) {
                            continue;
                        }

                        $hostCommand     = $this->returnPlannedPattern($oldItem['host']);
                        $serviceCommand  = $this->returnPlannedPattern($oldItem['service']);
                        $hostCommands    = explode(',', $hostCommand);
                        $serviceCommands = explode(',', $serviceCommand);

                        foreach ($hostCommands as $commandHost) {
                            foreach ($serviceCommands as $commandService) {
                                if ($this->pregMatchHost($commandHost, $host) && $this->pregMatchService($commandService, $service)) {
                                    $this->addToRemoveOldAlert($server, $host, $service);
                                }
                            }
                        }
                    }
                }
            }
        }

        $this->removeMultiScheduleOldPlanned();
        $this->db->removeOldPlanned($oldPlanned);
    }
}
