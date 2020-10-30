<?php

class xml
{
    function __construct()
    {
        global $serversList;

        $this->serversList = $serversList;
        $this->currentTab = 'All';
        $this->errorTabs = [];
        $this->timeoutTabs = [];
        $this->memcacheFullName = '';
        $this->hosts = [];
        $this->getDataFromMemcache = true;

        global $memcacheEnabled;
        global $memcacheHost;
        global $memcachePort;
        global $memcacheName;
        global $db;

        $this->memcacheEnabled          = $memcacheEnabled;
        $this->memcacheHost             = $memcacheHost;
        $this->memcachePort             = $memcachePort;
        $this->memcacheName             = $memcacheName;
        $this->groupByService           = 2;
        $this->groupByHost              = 11;
        $this->verificateCheck          = '';
        $this->statesArray              = [0 => 'OK', 1 => 'WARNING', 2 => 'CRITICAL', 3 => 'UNKNOWN'];
        $this->actions                  = new actions;
        $this->db                       = $db;
        $this->utils                    = new utils();
        $this->statusFile               = [];

        if ($this->memcacheEnabled) {
            $this->memcache = new Memcache;
            $this->memcache->connect($this->memcacheHost, $this->memcachePort);
        }

        $this->backendStatus = '';
    }

    public function setCurrentTab($tab = '')
    {
        if ($tab) {
            $this->currentTab = $tab;
        }
    }
    public function getCurrentTab()
    {
        return $this->currentTab;
    }
    private function verifyTab()
    {
        if (!isset($this->serversList) || !count($this->serversList)) {
            http_response_code(404);
            die('Please add at least one server to config.');
        }
    }
    private function setmemcacheFullName() {
        if ($this->memcacheEnabled) {
            $this->memcacheFullName = "nagiosUI_{$this->memcacheName}_{$this->currentTab}";
        }
    }

    public function returnXml($isHash)
    {
        $this->verifyTab();
        $this->setmemcacheFullName();

        if (!$this->getDataFromMemcache) {
            $start = time();
            if (!$this->getDataFromMemcache) {
                logText($this->currentTab . ": started");
            }
            $this->prepareDataToXml();
            list($hostsCount, $servicesCount) = $this->addDataToMemcache();
            if (!$this->getDataFromMemcache) {
                logText($this->currentTab . ": finished in ". (time() - $start) ."s. Processed: {$hostsCount} hosts and $servicesCount services.");
            }

            return;
        }

        if (!$this->memcacheEnabled || ($this->memcacheEnabled && !$this->memcache->get("{$this->memcacheFullName}_data"))) {
            $this->prepareDataToXml();

            if ($isHash) {
                return md5($this->verificateCheck);
            }

            return $this->generateXml();
        }

        if ($isHash) {
            return $this->memcache->get("{$this->memcacheFullName}_verify");
        }

        return unserialize($this->memcache->get("{$this->memcacheFullName}_data"));
    }

    public function log($text) {
        if (!$this->getDataFromMemcache) {
            echo date("Y-m-d H:i:s") . " " . $text . "\n";
        }
    }

    private function getFullDataStatusFile()
    {
        $statusFile = [];
        $retries = 5;

        while ($retries > 0) {
            $data = $this->curlRequest("/state");

            if ($this->isCorrectStatusFile($data)) {
                $statusFile = $data;
                break;
            }

            if ($this->tmpStatusFileError) {
                break;
            }

            sleep(2);
            $retries--;
        }

        return $statusFile;
    }
    private function getFullDataCollectAlerts($statusFile)
    {
        $alerts = [];

        if (!isset($statusFile['content']) || !count($statusFile['content'])) {
            return $alerts;
        }

        foreach ($statusFile['content'] as $host => $data) {
            $alerts[$host] = ['SERVER IS UP'];

            foreach ($data['services'] as $service => $serviceData) {
                $alerts[$host][] = $service;
            }
        }

        return $alerts;
    }
    public function getFullData($server)
    {
        $alertsList = [];
        $this->currentTabList = [$server];
        $this->currentTabTmp  = $server;

        $this->verifyNagiosApi();

        if (!in_array($this->currentTabTmp, $this->errorTabs)) {
            $statusFile = $this->getFullDataStatusFile();
            $alertsList = $this->getFullDataCollectAlerts($statusFile);
        }

        return $alertsList;
    }


    public function returnHosts()
    {
        return $this->hosts;
    }
    public function setAllToMemcache($hosts)
    {
        $start = time();
        logText($this->currentTab . ": started");

        $this->setmemcacheFullName();

        $this->currentTabTmp = array_keys($this->serversList);
        $this->currentTabTmp = end($this->currentTabTmp);

        foreach ($this->serversList as $key => $value) {
            $this->currentTabList[] = $key;
        }

        foreach ($hosts as $list) {
            foreach ($list as $host => $item) {
                foreach ($item as $service => $alert) {
                    if (!isset($this->hosts[$host])) {
                        $this->hosts[$host] = [];
                    }

                    if (!isset($this->hosts[$host][$service])) {
                        $this->hosts[$host][$service] = $alert;
                        $this->addToVerificateCheck($host, $service);
                        $this->checkBackendStatus((int)$alert['last_check']);
                    }
                }
            }
        }

        list($hostsCount, $servicesCount) = $this->addDataToMemcache();

        logText($this->currentTab . ": finished in ". (time() - $start) ."s. Processed: {$hostsCount} hosts and $servicesCount services.");
    }
    private function prepareDataToXml()
    {
        $this->currentTabList = [];

        if ($this->currentTab == 'All') {
            foreach ($this->serversList as $key => $value) {
                $this->currentTabList[] = $key;
            }
        } else {
            $this->currentTabList[] = $this->currentTab;
        }

        foreach ($this->currentTabList as $this->currentTabTmp) {
            $this->verifyNagiosApi();

            if (!in_array($this->currentTabTmp, $this->errorTabs)) {
                $this->otherFiles();
                $this->getHistoryChecks();
                $this->getHistoryUnfinishedAlerts();
                $this->getStatusFile();
            }
        }

        $this->prepareOtherData();
    }
    private function addDataToMemcache()
    {
        $hostsCount = 0;
        $servicesCount = 0;

        foreach ($this->hosts as $host => $services) {
            foreach ($services as $service => $attrs) {

                if ($service != 'FULL HOSTS LIST') {
                    $servicesCount++;
                } else {
                    $hostsCount++;
                }
            }
        }

        $errorsText = [];
        foreach ($this->errorTabs as $errorTab) {
            $errorsText[] = "Host is unreachable: ". $this->utils->returnServerHostAndPort($errorTab);
        }

        foreach ($this->timeoutTabs as $timeoutTab) {
            $errorsText[] = "Error fetching data for: ". $this->utils->returnServerHostAndPort($timeoutTab);
        }

        if (count($errorsText) < count($this->currentTabList)) {
            $data = serialize($this->generateXml());

            $this->memcache->set("{$this->memcacheFullName}_verify", md5($this->verificateCheck), 0, 3600);
            $this->memcache->set("{$this->memcacheFullName}_data", $data, 0, 3600);
        }

        if ($errorsText) {
            $this->memcache->set("{$this->memcacheFullName}_errors", json_encode(implode("<br />", $errorsText)), 0, 3600);
        } else {
            $this->memcache->set("{$this->memcacheFullName}_errors", "", 0, 3600);
        }

        return [$hostsCount, $servicesCount];
    }
    public function updateMemcache($server, $data, $command)
    {
        if ($this->memcacheEnabled) {
            $photo = "";

            if (isset($data['author'])) {
                $usersList = $this->db->returnUsersList();
                $photo = (isset($usersList[$data['author']])) ? $usersList[$data['author']] : '';
                $photo = ($photo) ? $photo : ((isset($usersList[$data['default']]) ? $usersList[$data['default']] : ''));
                $photo = md5($photo);
            }

            $servers = ['All', $server];
            foreach ($servers as $serverForMemcache) {
                $memcacheFullName = "nagiosUI_{$this->memcacheName}_{$serverForMemcache}";

                $oldData = $this->memcache->get("{$memcacheFullName}_data");
                $oldData = unserialize($oldData);

                try {
                    $xml = new SimpleXMLElement($oldData);
                } catch (Exception $e) {
                    continue;
                }

                if (in_array($command, ['unsched'])) {
                    foreach ($xml->children() as $value) {
                        if ($value->downtime_id != $data['down_id'] || $value->tab != $server) {
                            continue;
                        }

                        $value[0]->sched = 0;
                        $value[0]->sched_start = "";
                        $value[0]->sched_end = "";
                        $value[0]->sched_duration = "";
                        $value[0]->downtime_id = "";
                        $value[0]->sched_last_temp = "";
                        $value[0]->sched_last_author = "";
                        $value[0]->sched_comment = "";
                    }
                }

                if (in_array($command, ['unack', 'ack', 'sched'])) {
                    foreach ($xml->children() as $value) {
                        if ($value->host != $data['host'] || $value->service != $data['service'] || $value->tab != $server) {
                            continue;
                        }

                        if ($command == 'unack') {
                            $value[0]->acked = 0;
                            $value[0]->ack_last_temp = "";
                            $value[0]->ack_last_author = "";
                            $value[0]->quick_ack_author = "";
                            $value[0]->ack_comment = "";
                        }

                        if ($command == 'ack') {
                            $value[0]->acked = 1;
                            $value[0]->ack_last_temp = $data['comment'];
                            $value[0]->ack_last_author = $data['author'];
                            $value[0]->quick_ack_author = $photo;
                            $value[0]->ack_comment = "'". $data['comment'] ."' by ". $data['author'] ."<br />added: " . date('M j H:i');
                        }

                        if ($command == 'sched') {
                            $value[0]->sched = 1;
                            $value[0]->sched_start = time();
                            $value[0]->sched_end = time() + (int)$data['duration'];
                            $value[0]->sched_duration = (int)$data['duration'];
                            $value[0]->downtime_id = 0;
                            $value[0]->sched_last_temp = "";
                            $value[0]->sched_last_author = "";
                            $value[0]->sched_comment = "'". $data['comment'] ."' by ". $data['author'] ."<br />added: " . date('M j H:i');
                            $value[0]->quick_ack_author = $photo;
                        }
                    }
                }

                $newData = $xml->asXML();
                $newData = serialize($newData);

                $this->memcache->set("{$memcacheFullName}_verify", md5($newData), 0, 1200);
                $this->memcache->set("{$memcacheFullName}_data", $newData, 0, 1200);
            }
        }
    }
    private function generateXml()
    {
        $xmlContent  = '<alerts sort="1">';

        foreach ($this->hosts as $host => $services) {
            foreach ($services as $service => $attrs) {
                $comments = $attrs['comments'];

                $xmlContent .= '
	<alert state="' .           $this->parseToXML($attrs['state']) . '" origState="' . $this->parseToXML($attrs['origState']) . '">
		<host>' .               $this->parseToXML($host)                            . '</host>
		<host-url>' .           $this->parseToXML($attrs['full_host_name'])         . '</host-url>
		<service>' .            $this->parseToXML($service)                         . '</service>
		<service-url>' .        $this->parseToXML($attrs['full_service_name']) . '</service-url>
		<notes_url>' .          $this->parseToXML($attrs['notesUrl'])               . '</notes_url>
		<status>' .             $this->parseToXML($attrs['state'])                  . '</status>
		<origState>' .          $this->parseToXML($attrs['origState'])              . '</origState>
		<acked>' .              $this->parseToXML($attrs['acked'])                  . '</acked>
		<sched>' .              $this->parseToXML($attrs['scheduled'])              . '</sched>
		<downtime_id>' .        $this->parseToXML($comments['downtime_id'])         . '</downtime_id>
		<ack_last_temp>' .      $this->parseToXML($comments['ackLastTemp'])         . '</ack_last_temp>
		<ack_last_author>' .    $this->parseToXML($comments['ackLastAuthor'])       . '</ack_last_author>
		<sched_last_temp>' .    $this->parseToXML($comments['schedLastTemp'])       . '</sched_last_temp>
		<sched_last_author>' .  $this->parseToXML($comments['schedLastAuthor'])     . '</sched_last_author>
		<quick_ack_author>' .   md5(strtolower(trim($attrs['userAvatar'])))         . '</quick_ack_author>
		<planned_author>' .     md5(strtolower(trim($attrs['scheduserAvatar'])))    . '</planned_author>
		<sched_comment>' .      $this->parseToXML($comments['schedComment'])        . '</sched_comment>
		<ack_comment>' .        $this->parseToXML($comments['ackComment'])          . '</ack_comment>
		<last_check>' .         $this->parseToXML($attrs['last_check_date'])        . '</last_check>
		<last_check_sec>' .     $this->parseToXML($attrs['last_check'])             . '</last_check_sec>
		<durationSec>' .        $this->parseToXML($attrs['durationSec'])            . '</durationSec>
		<durationSec9Digits>' . $this->parseToXML(sprintf('%09d', $attrs['durationSec'])) . '</durationSec9Digits>
		<duration>' .           $this->parseToXML($attrs['duration'])               . '</duration>
		<attempt>' .            $this->parseToXML($attrs['attempt'])                . '</attempt>
		<status_information>' . $this->parseToXML($attrs['pluginOutput'])           . '</status_information>
		<host_or_service>' .    $this->parseToXML($attrs['host_or_service'])        . '</host_or_service>
		<sched_start>' .        $this->parseToXML($comments['schedStart'])          . '</sched_start>
		<sched_end>' .          $this->parseToXML($comments['schedEnd'])            . '</sched_end>
		<sched_duration>' .     $this->parseToXML($comments['schedDuration'])       . '</sched_duration>
		<pending>' .            $this->parseToXML($attrs['pending'])                . '</pending>
		<next_check>' .         $this->parseToXML($attrs['next_check'])             . '</next_check>
		<tab>' .                $this->parseToXML($attrs['tab'])                    . '</tab>
	</alert>';
            }
        }

        $xmlContent .= '
	<hash>'.                 md5($this->verificateCheck)                        .'</hash>
	<nagios-config-file>json_new.php?returndate=1</nagios-config-file>
	<nagios-full-list-url>'. $this->parseToXML($this->serversList[$this->currentTabTmp]['fullHostUrl']) .'</nagios-full-list-url>
	<group-by-service>'.     $this->parseToXML($this->groupByService)           .'</group-by-service>
	<group-by-host>'.        $this->parseToXML($this->groupByHost)              .'</group-by-host>
	<backend_status>'.       $this->backendStatus                               .'</backend_status>
</alerts>';

        return $xmlContent;
    }
    private function prepareOtherData()
    {
        $usersArray = $this->db->returnUsersList();

        foreach ($this->hosts as $host => $services) {
            foreach ($services as $service => $attrs) {
                $comments = $this->hosts[$host][$service]['comments'];

                $this->hosts[$host][$service]['state']           = !is_integer($attrs['state']) ? $attrs['state'] : $this->statesArray[$attrs['state']];
                $this->hosts[$host][$service]['origState']       = '';
                $this->hosts[$host][$service]['pluginOutput']    = nl2br(htmlentities(str_replace(array('<br>', '<br/>'), array("\n", "\n"), $attrs['plugin_output']), ENT_XML1));
                $this->hosts[$host][$service]['pending']         = (!$attrs['state'] && !$attrs['last_status_change'] && $attrs['active_enabled']) ? 1 : 0;
                $this->hosts[$host][$service]['notesUrl']        = $this->returnNotesUrl($host, $service, $this->hosts[$host][$service]['tab']);
                $this->hosts[$host][$service]['last_check_date'] = $this->getLastCheckDate($attrs['last_check'], 'm-d-Y H:i:s');
                $this->hosts[$host][$service]['attempt']         = $attrs['attempts']/$attrs['max_attempts'];
                $this->hosts[$host][$service]['host_or_service'] = ($service == "SERVER IS UP") ? "host" : "service";
                $this->hosts[$host][$service]['userAvatar']      = (isset($usersArray[$comments['ackLastAuthor']]))   ? $usersArray[$comments['ackLastAuthor']]   : '';
                $this->hosts[$host][$service]['scheduserAvatar'] = (isset($usersArray[$comments['schedLastAuthor']])) ? $usersArray[$comments['schedLastAuthor']] : '';

                $this->setDurations($host, $service, $attrs['scheduled'], $attrs['last_status_change']);
                $this->addToVerificateCheck($host, $service);
            }
        }
    }
    private function getLastCheckDate($time, $format = 'm-d-Y H:i:s') {
        global $serversList, $timeZone;

        $time = intval($time);

        if (isset($serversList[$this->currentTabTmp]) && isset($serversList[$this->currentTabTmp]['timeZone'])) {
            date_default_timezone_set($serversList[$this->currentTabTmp]['timeZone']);
            $date = date($format, $time);
            date_default_timezone_set($timeZone);

            return $date;
        }

        return date('m-d-Y H:i:s', $time);
    }
    private function prepareAckSchedComment($comment, $author, $date)
    {
        $result  = $this->utils->parseUrls($comment, $this->currentTabTmp);
        $result  = "'{$result}' by {$author}";
        $result .= (intval($date)) ? ('<br />added: '. $this->getLastCheckDate($date, 'M j H:i')) : '';

        return $result;
    }
    private function removeDuplicates($ids, $comments, $service, $host) {
        $newList     = [];
        $return      = [];
        $lastComment = '';

        for ($i = 0; $i < count($comments); $i++) {
            $newList[$ids[$i]] = $comments[$i];
        }

        natsort($newList);

        foreach ($newList as $key => $value) {
            if (!$lastComment || explode(' by ', $lastComment)[0] != explode(' by ', $value)[0]) {
                $return[$key] = $lastComment = $value;
            } else if (explode(' by ', $lastComment)[0] == explode(' by ', $value)[0]) {
                if ($key != 4) {
                    $this->actions->setType('downtime');
                    $this->actions->setServer($this->currentTabTmp);

                    $request = [
                        'tab'     => $this->currentTab,
                        'host'    => $host,
                        'down_id' => $key,
                        'isHost'  => ($service != 'SERVER IS UP') ? 'service' : 'host',
                    ];

                    if ($request['isHost'] == 'service') {
                        $request['service'] = $service;
                    }

                    $this->actions->runActions([$request]);
                }
            }
        }

        return $return;
    }
    private function isNagiosApi($server)
    {
        $servicesPath = (isset($this->serversList[$server]['notesUrlServicesPath'])) ? $this->serversList[$server]['notesUrlServicesPath'] : '';
        $hostsPath    = (isset($this->serversList[$server]['notesUrlHostsPath']))    ? $this->serversList[$server]['notesUrlHostsPath']    : '';

        return !($servicesPath || $hostsPath);
    }
    private function otherFiles()
    {
        if ($this->isNagiosApi($this->currentTabTmp)) {
            $this->notesUrls[$this->currentTabTmp] = $this->db->notesUrlsNagiosApi($this->currentTabTmp);
        } else {
            $this->notesUrls[$this->currentTabTmp] = $this->db->notesUrls($this->currentTabTmp);
        }
    }
    private function verifyMatchService($host, $service, $state, $scheduled, $last_status_change, $active_checks_enabled)
    {
        if (
                $state > 0
            || (!$state && $scheduled)
            || (!$state && !$last_status_change && $active_checks_enabled)
        ) {
            return true;
        }

        return false;
    }
    private function verifyMatchHost($host, $service, $state, $last_status_change, $active_checks_enabled)
    {
        if ($state > 0 || (!$state && !$last_status_change && $active_checks_enabled)) {
            return true;
        }

        return false;
    }
    private function returnNotesUrl($host, $service, $server)
    {
        if ($this->isNagiosApi($server)) {
            $notesUrl = (isset($this->notesUrls[$server][$host]) && isset($this->notesUrls[$server][$host][$service])) ? $this->notesUrls[$server][$host][$service] : '';
        } else {
            if ($service == 'SERVER IS UP') {
                $notesUrl = (isset($this->notesUrls[$server][$host])) ? $this->notesUrls[$server][$host] : '';
            } else {
                $notesUrl = (isset($this->notesUrls[$server][$service])) ? $this->notesUrls[$server][$service] : '';
            }
        }

        if (preg_match("/zabbix_redirect/", $notesUrl)) {
            $notesUrl = strstr($notesUrl, 'host=', true) . "host={$host}&" . strstr($notesUrl, 'item=', false);
        }

        return $notesUrl;
    }
    private function setDurations($host, $service, $scheduled, $last_status_change)
    {
        $this->hosts[$host][$service]['durationSec'] = time() - $last_status_change;
        $this->hosts[$host][$service]['duration']    = $this->duration($this->hosts[$host][$service]['durationSec'], false);
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
    private function addToVerificateCheck($host, $service)
    {
        $item = $this->hosts[$host][$service];

        $this->verificateCheck .= $host . $service . $item['state'] . $item['origState'] . $service . $this->currentTabTmp;
        $this->verificateCheck .= $item['comments']['ackLastTemp'] . $item['attempt'] . $item['notesUrl'] . $item['acked'];
        $this->verificateCheck .= $item['scheduled'] . $item['comments']['downtime_id'] . $item['comments']['ackLastAuthor'];
        $this->verificateCheck .= $item['plugin_output'] . $item['comments']['schedComment'] . $item['last_check_date'];
        $this->verificateCheck .= $item['comments']['ackComment'] . $item['comments']['schedLastAuthor'];
    }
    private function parseToXML($htmlStr) {

        $htmlStr = preg_replace('/[^\x{0009}\x{000a}\x{000d}\x{0020}-\x{D7FF}\x{E000}-\x{FFFD}]+/u', ' ', $htmlStr);
        $htmlStr = preg_replace('/(?:
                  \xF0[\x90-\xBF][\x80-\xBF]{2}      # planes 1-3
                | [\xF1-\xF3][\x80-\xBF]{3}          # planes 4-15
                | \xF4[\x80-\x8F][\x80-\xBF]{2}      # plane 16
            )/xs', '', $htmlStr);

        $xmlStr = htmlspecialchars($htmlStr, ENT_QUOTES | ENT_XML1);
        return $xmlStr;
    }
    private function hostUrl($host) {
        return str_replace('___host___', $host, $this->serversList[$this->currentTabTmp]['hostUrl']);
    }
    private function serviceUrl($host, $service) {
        $service = str_replace('+', ' ', urlencode($this->parseToXML($service)));

        if ($service == 'SERVER IS UP' || $service == 'SERVER+IS+UP') {
            return $this->hostUrl($host);
        }

        return str_replace('___host___', $host, str_replace('___service___', $service, $this->serversList[$this->currentTabTmp]['serviceUrl']));
    }
    private function checkBackendStatus($lastCheck)
    {
        if (!$this->backendStatus && round(microtime(true) - $lastCheck) < 600) {
            $this->backendStatus = 'ok';
        }
    }

    private function getHistoryChecks() {
        $this->historyChecks = $this->db->historyGetChecks($this->currentTabTmp);
    }
    private function getHistoryUnfinishedAlerts() {
        $this->unfinishedAlerts = $this->db->historyGetUnfinishedAlerts($this->currentTabTmp);
    }
    private function addHistoryData($host, $service, $data)
    {
        $state = (int)$data['current_state'];

        if ($state && (int) $data['last_hard_state']) {
            if (isset($this->unfinishedAlerts[$host]) && isset($this->unfinishedAlerts[$host][$service])) {
                $this->insertOrUpdateHistory($data, $host, $service, $this->statesArray[$state], false);
            } else {
                $checkId = $this->returnOrInsertHistoryId($host, $service);
                $this->db->historyAddHistory($checkId, 'unhandled', $this->statesArray[$state], NULL, NULL, $data['plugin_output']);
            }
        } else if (!$state) {
            if (isset($this->unfinishedAlerts[$host]) && isset($this->unfinishedAlerts[$host][$service])) {
                $this->insertOrUpdateHistory($data, $host, $service, $this->statesArray[$state], true);
            }
        }
    }
    private function insertOrUpdateHistory($data, $host, $service, $state, $isOk = false)
    {
        $old_severity = $this->returnHistoryId($host, $service, 'severity');

        if ((int) $data['problem_has_been_acknowledged']) {
            $values   = array_values($data['comments']);
            $values   = end($values);
            $user     = $values['author'];
            $comment  = $values['comment_data'];
            $severity = ($comment == 'temp') ? 'quick_acked' : 'acked';
        } else if ((int) $data['scheduled_downtime_depth']) {
            $values   = array_values($data['downtimes']);
            $values   = end($values);
            $user     = $values['author'];
            $comment  = $values['comment'];
            $severity = (substr($comment, 0, 9) == '(planned)') ? 'planned_downtime' : 'sched';
        } else {
            $user     = NULL;
            $comment  = NULL;
            $severity = 'unhandled';
        }

        if ($old_severity == $severity && !$isOk) {
            unset($this->unfinishedAlerts[$host][$service]);
            return;
        }

        $user     = ($isOk) ? NULL : $user;
        $comment  = ($isOk) ? NULL : $comment;
        $check_id = $this->returnHistoryId($host, $service, 'check_id');
        $this->db->historyAddHistory($check_id, $severity, $state, $user, $comment, $data['plugin_output']);

        unset($this->unfinishedAlerts[$host][$service]);
    }
    private function returnHistoryId($host, $service, $column) {
        if (isset($this->unfinishedAlerts[$host]) && isset($this->unfinishedAlerts[$host][$service])) {
            return $this->unfinishedAlerts[$host][$service][$column];
        }

        return "";
    }
    private function returnOrInsertHistoryId($host, $service) {
        if (isset($this->historyChecks['checks'])
            && isset($this->historyChecks['checks'][$host])
            && isset($this->historyChecks['checks'][$host][$service])
        ) {
            return $this->historyChecks['checks'][$host][$service];
        }

        return $this->db->historyAddCheck($host, $service, $this->currentTabTmp);
    }

    private function getStatusFile() {
        $this->statusFile = [];
        $retries = 5;

        while ($retries > 0) {
            $data = $this->curlRequest("/state");

            if ($this->isCorrectStatusFile($data)) {
                $this->statusFile = $data;
                break;
            }

            if ($this->tmpStatusFileError) {
                break;
            }

            sleep(2);
            $retries--;
        }

        $this->prepareHosts();
    }
    private function isCorrectStatusFile($data)
    {
        if (    $data
            && !empty($data)
            && isset($data['content'])
            && !empty($data['content'])
            && count($data['content'])
            && isset($data['success'])
            && $data['success']
        ) {
            return true;
        }

        return false;
    }

    private function verifyNagiosApi()
    {
        $path = $this->serversList[$this->currentTabTmp]['url'] . '/status';

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_PORT,           $this->serversList[$this->currentTabTmp]['port']);
        curl_setopt($curl, CURLOPT_URL,            $path);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 1);
        curl_setopt($curl, CURLOPT_TIMEOUT, 1);

        curl_exec($curl);

        if (curl_errno($curl)) {
            $error_msg = curl_error($curl);

            if ($error_msg == 'connect() timed out!'
                || $error_msg == 'couldn\'t connect to host'
                || preg_match('#^connection timed out after?#i', $error_msg) === 1
                || preg_match('#^Could not resolve host?#i', $error_msg) === 1
                || preg_match('#^Failed to connect to?#i', $error_msg) === 1
            ) {
                $this->errorTabs[] = $this->currentTabTmp;
            }
        }

        curl_close($curl);
    }
    private function curlRequest($url)
    {
        $this->tmpStatusFileError = false;
        $path = $this->serversList[$this->currentTabTmp]['url'] . $url;
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_PORT, $this->serversList[$this->currentTabTmp]['port']);
        curl_setopt($curl, CURLOPT_URL,            $path);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($curl, CURLOPT_TIMEOUT, 30);

        $result = curl_exec($curl);

        if (curl_errno($curl)) {
            $error_msg = curl_error($curl);

            if ($error_msg == 'connect() timed out!'
                || $error_msg == 'couldn\'t connect to host'
                || preg_match('#^connection timed out after?#i', $error_msg) === 1
                || preg_match('#^Could not resolve host?#i', $error_msg) === 1
                || preg_match('#^Failed to connect to?#i', $error_msg) === 1
            ) {
                $this->timeoutTabs[] = $this->currentTabTmp;
                $this->tmpStatusFileError = true;
            }

            curl_close($curl);
            return '';
        }

        curl_close($curl);
        $result = json_decode($result, true);

        if (json_last_error()) {
            return '';
        }

        return $result;
    }

    private function prepareHosts()
    {
        if (!isset($this->statusFile['content']) || !count($this->statusFile['content'])) {
            return;
        }

        foreach ($this->unfinishedAlerts as $tab => $data) {
            foreach ($data as $alert) {
                if ($alert['service'] == 'SERVER IS UP') {
                    if (isset($this->statusFile['content']) && isset($this->statusFile['content'][$alert['host']])) {
                        continue;
                    }

                    $this->db->historyAddHistory($alert['check_id'], 'unhandled', $this->statesArray[0], NULL, NULL, $alert['output']);
                    continue;
                }

                if ($alert['service'] == 'FULL HOSTS LIST') {
                    if (isset($this->statusFile['content']) && isset($this->statusFile['content'][$alert['host']])) {
                        continue;
                    }

                    $this->db->historyAddHistory($alert['check_id'], 'unhandled', $this->statesArray[0], NULL, NULL, $alert['output']);
                    continue;
                }

                if (
                        isset($this->statusFile['content'])
                     && isset($this->statusFile['content'][$alert['host']])
                     && isset($this->statusFile['content'][$alert['host']]['services'])
                     && isset($this->statusFile['content'][$alert['host']]['services'][$alert['service']])
                ) {
                    continue;
                } else {
                    $this->db->historyAddHistory($alert['check_id'], 'unhandled', $this->statesArray[0], NULL, NULL, $alert['output']);
                }
            }
        }

        foreach ($this->statusFile['content'] as $host => $data) {
            $this->addHostToList($host, $data);
        }
    }
    private function addHostToList($host, $data)
    {
        $service = 'SERVER IS UP';
        if ($this->verifyMatchHost($host, $service, (int)$data['current_state'], (int)$data['last_state_change'], 0)) {
            $this->hosts[$host][$service] = array(
                'state'              => 2, // down host is always shown as CRITICAL alert
                'origState'          => '',
                'acked'              => (int)$data['problem_has_been_acknowledged'],
                'scheduled'          => (int)$data['scheduled_downtime_depth'],
                'last_status_change' => (int)$data['last_state_change'],
                'plugin_output'      => $data['plugin_output'],
                'attempts'           => (int)$data['current_attempt'],
                'max_attempts'       => (int)$data['max_attempts'],
                'last_check'         => (int)$data['last_check'],
                'active_enabled'     => 0,
                'next_check'         => 0,
                'full_host_name'     => $this->hostUrl($host),
                'full_service_name'  => $this->serviceUrl($host, $service),
                'check_command'      => $service,
                'comments'           => $this->returnCommentData($data, $service, $host),
                'tab'                => $this->currentTabTmp,
            );
        }

        $service = 'FULL HOSTS LIST';
        $this->hosts[$host][$service] = array(
            'state'              => (int)$data['current_state'],
            'origState'          => '',
            'acked'              => (int)$data['problem_has_been_acknowledged'],
            'scheduled'          => (int)$data['scheduled_downtime_depth'],
            'last_status_change' => (int)$data['last_state_change'],
            'plugin_output'      => $data['plugin_output'],
            'attempts'           => (int)$data['current_attempt'],
            'max_attempts'       => (int)$data['max_attempts'],
            'last_check'         => (int)$data['last_check'],
            'active_enabled'     => 0,
            'next_check'         => 0,
            'full_host_name'     => $this->hostUrl($host),
            'full_service_name'  => $this->serviceUrl($host, $service),
            'check_command'      => $service,
            'comments'           => $this->returnCommentData($data, $service, $host),
            'tab'                => $this->currentTabTmp,
        );

        $this->addHistoryData($host, $service, $data);
        $this->checkBackendStatus((int)$data['last_check']);

        foreach ($data['services'] as $service => $serviceData) {
            $this->addServiceToList($host, $service, $serviceData);
        }
    }
    private function addServiceToList($host, $service, $data)
    {
        if ($this->verifyMatchService($host, $service, (int)$data['current_state'], (int)$data['scheduled_downtime_depth'], (int)$data['last_state_change'], (int)$data['active_checks_enabled'])){
            $this->hosts[$host][$service] = array(
                'acked'              => (int)$data['problem_has_been_acknowledged'],
                'scheduled'          => (int)$data['scheduled_downtime_depth'],
                'state'              => (int)$data['current_state'],
                'origState'          => '',
                'last_status_change' => (int)$data['last_state_change'],
                'plugin_output'      => $data['plugin_output'],
                'attempts'           => (int)$data['current_attempt'],
                'max_attempts'       => (int)$data['max_attempts'],
                'last_check'         => (int)$data['last_check'],
                'active_enabled'     => (int)$data['active_checks_enabled'],
                'next_check'         => 0,
                'full_host_name'     => $this->hostUrl($host),
                'full_service_name'  => $this->serviceUrl($host, $service),
                'check_command'      => $service,
                'comments'           => $this->returnCommentData($data, $service, $host),
                'tab'                => $this->currentTabTmp,
            );
        }

        $this->addHistoryData($host, $service, $data);
        $this->checkBackendStatus((int)$data['last_check']);
    }
    private function returnCommentData($data, $service, $host)
    {
        $result = [
            'ackComment'      => [],
            'ackLastAuthor'   => [],
            'ackLastTemp'     => [],
            'downtime_id'     => [],
            'schedComment'    => [],
            'schedLastAuthor' => [],
            'schedStart'      => '',
            'schedEnd'        => '',
            'schedDuration'   => '',
        ];

        foreach ($data['downtimes'] as $downtime) {
            $result['downtime_id'][]  = $downtime['downtime_id'];
            $result['schedComment'][] = $this->prepareAckSchedComment($downtime['comment'], $downtime['author'], $downtime['entry_time']);
            $result['schedStart']     = $downtime['start_time'];
            $result['schedEnd']       = $downtime['end_time'];
            $result['schedDuration']  = $downtime['duration'];
        }

        foreach ($data['comments'] as $comment) {
            if ((int)$comment['entry_type'] != 2) {
                $result['ackComment'][]    = $this->prepareAckSchedComment($comment['comment_data'], $comment['author'], $comment['entry_time']);
                $result['ackLastAuthor'][] = $comment['author'];
                $result['ackLastTemp'][]   = $comment['comment_data'];
            }
        }

        if (count($result['schedComment']) > 1) {
            $return = $this->removeDuplicates($result['downtime_id'], $result['schedComment'], $service, $host);

            $result['downtime_id']  = array_keys($return);
            $result['schedComment'] = array_values($return);
        }

        $result['ackComment']      = implode('<br /><br />', $result['ackComment']);
        $result['schedComment']    = implode('<br /><br />', $result['schedComment']);
        $result['ackLastAuthor']   = (!empty($result['ackLastAuthor']))   ? end($result['ackLastAuthor'])         : '';
        $result['schedLastAuthor'] = (!empty($result['schedLastAuthor'])) ? end($result['schedLastAuthor'])       : '';
        $result['ackLastTemp']     = (!empty($result['ackLastTemp']))     ? end($result['ackLastTemp'])           : '';
        $result['schedLastTemp']   = (!empty($result['schedLastTemp']))   ? end($result['schedLastTemp'])         : '';
        $result['downtime_id']     = (!empty($result['downtime_id']))     ? implode(',', $result['downtime_id'])  : '';

        return $result;
    }
}
