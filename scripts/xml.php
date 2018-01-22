<?php

class xml
{
    function __construct()
    {
        global $statusFile_global;
        global $alertsPercentile_global;
        global $durationsFromFile_global;
        global $getNotesUrls_cacheFile;
        global $getDepends_cacheFile;
        global $nagiosCommentUrl;
        global $usersArray;
        global $nagiosConfigFile;
        global $nagiosFullHostUrl;
        global $groupByService;
        global $groupByHost;
        global $refreshArray;
        global $memcacheEnabled;
        global $memcacheHost;
        global $memcachePort;
        global $memcacheName;
        global $xmlArchive;
        global $nagiosHostUrl;
        global $nagiosServiceUrl;

        $this->statusFile_global        = $statusFile_global;
        $this->alertsPercentile_global  = $alertsPercentile_global;
        $this->durationsFromFile_global = $durationsFromFile_global;
        $this->getNotesUrls_cacheFile   = $getNotesUrls_cacheFile;
        $this->getDepends_cacheFile     = $getDepends_cacheFile;
        $this->nagiosCommentUrl         = $nagiosCommentUrl;
        $this->usersArray               = $usersArray;
        $this->nagiosConfigFile         = $nagiosConfigFile;
        $this->groupByService           = $groupByService;
        $this->groupByHost              = $groupByHost;
        $this->refreshArray             = $refreshArray;
        $this->memcacheEnabled          = $memcacheEnabled;
        $this->memcacheHost             = $memcacheHost;
        $this->memcachePort             = $memcachePort;
        $this->memcacheName             = $memcacheName;
        $this->xmlArchive               = $xmlArchive;
        $this->verificateCheck          = '';
        $this->statesArray              = [0 => 'OK', 1 => 'WARNING', 2 => 'CRITICAL', 3 => 'UNKNOWN'];
        $this->actions                  = new actions;
        $this->fullHostUrl              = $nagiosFullHostUrl;
        $this->hostUrl                  = $nagiosHostUrl;
        $this->serviceUrl               = $nagiosServiceUrl;

        if ($this->memcacheEnabled) {
            $this->memcache = new Memcache;
            $this->memcache->connect($this->memcacheHost, $this->memcachePort);
        }

        $this->backendStatus = '';
    }

    public function returnXml($isHash, $xmlFile)
    {
        $this->startMemcacheCheck();

        if ($isHash) {
            $this->prepareDataToXml();

            if ($this->memcacheEnabled && $this->memcache->get("nagiosUI_{$this->memcacheName}_verify") != md5($this->verificateCheck)) {
                $this->addDataToMemcache();
            }

            $this->stopMemcacheCheck();

            return md5($this->verificateCheck);
        }


        if ($xmlFile) {
            $this->stopMemcacheCheck();

            if ($file = $this->verifyXmlArchive()) {
                return file_get_contents($file);
            }

            $this->dieXmlArchiveNotFound();
        }

        if ($this->memcacheEnabled) {
            if (!$this->memcache->get("nagiosUI_{$this->memcacheName}_data") || !$this->memcache->get("nagiosUI_{$this->memcacheName}_verify")) {
                $this->prepareDataToXml();
                $this->addDataToMemcache();
            }

            $this->stopMemcacheCheck();

            return unserialize($this->memcache->get("nagiosUI_{$this->memcacheName}_data"));
        }

        $this->prepareDataToXml();

        return $this->generateXml();
    }
    public function dieXmlArchiveNotFound()
    {
        http_response_code(404);
        die('Archive file not found.');
    }
    public function verifyXmlArchive()
    {
        $files = glob($this->xmlArchive . $_GET['file'] . "*.log");

        if ($files[0]) {
            return $files[0];
        }

        return false;
    }
    private function stopMemcacheCheck()
    {
        if ($this->memcacheEnabled) {
            $this->memcache->delete("nagiosUI_{$this->memcacheName}_check");
        }
    }
    private function startMemcacheCheck()
    {
        if ($this->memcacheEnabled) {
            $this->memcache->set("nagiosUI_{$this->memcacheName}_check", "started", 0, 10);
        }
    }
    private function prepareDataToXml()
    {
        $this->otherFiles();
        $this->statusFile = file_get_contents($this->statusFile_global);
        $this->pregMatches();
        $this->prepareHosts();
        $this->prepareComments();
        $this->prepareOtherData();
    }
    private function addDataToMemcache()
    {
        $this->memcache->set("nagiosUI_{$this->memcacheName}_verify", md5($this->verificateCheck), 0, 120);
        $this->memcache->set("nagiosUI_{$this->memcacheName}_data", serialize($this->generateXml()), 0, 120);
        $this->memcache->delete("nagiosUI_{$this->memcacheName}_check");
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
		<host-url>' .           $this->parseToXML($this->hostUrl($attrs['full_host_name'])) . '</host-url>
		<service>' .            $this->parseToXML($service)                         . '</service>
		<service-url>' .        $this->parseToXML($this->serviceUrl($attrs['full_host_name'], $service)) . '</service-url>
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
	</alert>';
            }
        }

        $xmlContent .= '
	<hash>'.                 md5($this->verificateCheck)                        .'</hash>
	<nagios-config-file>'.   $this->parseToXML($this->nagiosConfigFile)         .'</nagios-config-file>
	<nagios-full-list-url>'. $this->parseToXML($this->fullHostUrl)              .'</nagios-full-list-url>
	<group-by-service>'.     $this->parseToXML($this->groupByService)           .'</group-by-service>
	<group-by-host>'.        $this->parseToXML($this->groupByHost)              .'</group-by-host>
	<nagios-comment-url>'.   $this->parseToXML($this->nagiosCommentUrl)         .'</nagios-comment-url>
	<refresh-array>'.        $this->parseToXML($this->returnRefreshArray())     .'</refresh-array>
	<backend_status>'.       $this->backendStatus                               .'</backend_status>
</alerts>';

        return $xmlContent;
    }
    private function prepareOtherData()
    {
        foreach ($this->hosts as $host => $services) {
            foreach ($services as $service => $attrs) {
                $comments = $this->hosts[$host][$service]['comments'];

                $this->hosts[$host][$service]['state']           = $this->statesArray[$attrs['state']];
                $this->hosts[$host][$service]['origState']       = '';
                $this->hosts[$host][$service]['pluginOutput']    = nl2br(htmlentities(str_replace(array('<br>', '<br/>'), array("\n", "\n"), $attrs['plugin_output']), ENT_XML1));
                $this->hosts[$host][$service]['pending']         = (!$attrs['state'] && !$attrs['last_status_change'] && $attrs['active_enabled']) ? 1 : 0;
                $this->hosts[$host][$service]['notesUrl']        = $this->returnNotesUrl($host, $service);
                $this->hosts[$host][$service]['last_check_date'] = date('m-d-Y H:i:s', $attrs['last_check']);
                $this->hosts[$host][$service]['attempt']         = $attrs['attempts']/$attrs['max_attempts'];
                $this->hosts[$host][$service]['host_or_service'] = ($service == "SERVER IS UP") ? "host" : "service";
                $this->hosts[$host][$service]['userAvatar']      = (isset($this->usersArray[$comments['ackLastAuthor']]))   ? $this->usersArray[$comments['ackLastAuthor']]   : '';
                $this->hosts[$host][$service]['scheduserAvatar'] = (isset($this->usersArray[$comments['schedLastAuthor']])) ? $this->usersArray[$comments['schedLastAuthor']] : '';

                $this->setDurations($host, $service, $attrs['scheduled'], $attrs['last_status_change']);
                $this->addToVerificateCheck($host, $service);
            }
        }
    }
    private function prepareHosts()
    {
        preg_match_all($this->pregHostStatus,    $this->statusFile, $hostsMatches);
        preg_match_all($this->pregServiceStatus, $this->statusFile, $servicesMatches);

        if (!count($hostsMatches) || !count($servicesMatches['host'])) {
            http_response_code(404);
            die;
        }

        $this->hosts = [];

        foreach ($servicesMatches['host'] as $k=>$host) {
            if ($this->verifyMatch($host, $servicesMatches['service'][$k], $servicesMatches['state'][$k], $servicesMatches['scheduled'][$k], $servicesMatches['last_status_change'][$k], $servicesMatches['active_checks_enabled'][$k])){
                $this->hosts[$host][$servicesMatches['service'][$k]] = array(
                    'acked'              => $servicesMatches['acked'][$k],
                    'scheduled'          => $servicesMatches['scheduled'][$k],
                    'state'              => $servicesMatches['state'][$k],
                    'origState'          => '',
                    'last_status_change' => $servicesMatches['last_status_change'][$k],
                    'plugin_output'      => $servicesMatches['plugin_output'][$k],
                    'attempts'           => $servicesMatches['attempts'][$k],
                    'max_attempts'       => $servicesMatches['max_attempts'][$k],
                    'last_check'         => $servicesMatches['last_check'][$k],
                    'active_enabled'     => $servicesMatches['active_checks_enabled'][$k],
                    'next_check'         => $servicesMatches['next_check'][$k],
                    'full_host_name'     => $host,
                    'check_command'      => $servicesMatches['service'],
                    'comments'           => [
                        'ackComment'      => '',
                        'schedComment'    => '',
                        'downtime_id'     => '',
                        'ackLastTemp'     => '',
                        'ackLastAuthor'   => '',
                        'schedStart'      => '',
                        'schedEnd'        => '',
                        'schedDuration'   => '',
                        'schedLastAuthor' => '',
                        'schedLastTemp'   => '',
                    ],
                );
            }

            $this->checkBackendStatus($servicesMatches['last_check'][$k]);
        }
        unset($servicesMatches);

        foreach ($hostsMatches['host'] as $k=>$host) { // copying down host alerts to normal service alerts
            if ($this->verifyMatch($host, 'SERVER IS UP', 2, $hostsMatches['scheduled'][$k], $hostsMatches['last_status_change'][$k], 0)){
                unset($this->hosts[$host]);

                $this->hosts[$host]['SERVER IS UP'] = array(
                    'state'              => 2, // down host is always shown as CRITICAL alert
                    'origState'          => '',
                    'acked'              => $hostsMatches['acked'][$k],
                    'scheduled'          => $hostsMatches['scheduled'][$k],
                    'last_status_change' => $hostsMatches['last_status_change'][$k],
                    'plugin_output'      => $hostsMatches['plugin_output'][$k],
                    'attempts'           => $hostsMatches['attempts'][$k],
                    'max_attempts'       => $hostsMatches['max_attempts'][$k],
                    'last_check'         => $hostsMatches['last_check'][$k],
                    'active_enabled'     => 0,
                    'next_check'         => 0,
                    'full_host_name'     => $host,
                    'check_command'      => 'SERVER IS UP',
                    'comments'           => [
                        'ackComment'      => '',
                        'schedComment'    => '',
                        'downtime_id'     => '',
                        'ackLastTemp'     => '',
                        'ackLastAuthor'   => '',
                        'schedStart'      => '',
                        'schedEnd'        => '',
                        'schedDuration'   => '',
                        'schedLastAuthor' => '',
                        'schedLastTemp'   => '',
                    ],
                );
            }

            $this->checkBackendStatus($servicesMatches['last_check'][$k]);
        }
    }
    private function prepareAckSchedComment($comment, $author, $date)
    {
        $result  = preg_replace('/(([A-Z]{2,4}-\d+))/', $this->nagiosCommentUrl, $comment);
        $result  = "'{$result}' by {$author}";
        $result .= ($date) ? '<br />added: '. date('M j H:i', intval($date)) : '';

        return $result;
    }
    private function prepareComments()
    {
        $comments = $this->mergeComments([
            $this->returnComments($this->pregServiceComment,   $this->statusFile, false),
            $this->returnComments($this->pregDowntimeComment,  $this->statusFile, false),
            $this->returnComments($this->pregHostDownComment,  $this->statusFile, true),
            $this->returnComments($this->pregHostSchedComment, $this->statusFile, true),
            $this->returnComments($this->pregHostComment,      $this->statusFile, true),
        ]);

        $this->setCommentsToHost($comments);
    }
    private function setCommentsToHost($comments)
    {
        foreach ($comments as $host => $services) {
            foreach ($services as $service => $items) {
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

                foreach ($items as $comment) {
                    if ($comment['ackComment']) {
                        $result['ackComment'][]    = $this->prepareAckSchedComment($comment['ackComment'], $comment['ackAuthor'], $comment['ackCommentDate']);
                        $result['ackLastAuthor'][] = $comment['ackAuthor'];
                        $result['ackLastTemp'][]   = $comment['ackComment'];
                    }
                    if ($comment['downtime_id']) {
                        $result['downtime_id'][] = $comment['downtime_id'];
                    }
                    if ($comment['schedComment']) {
                        $result['schedComment'][]    = $this->prepareAckSchedComment($comment['schedComment'], $comment['schedAuthor'], $comment['schedCommentDate']);
                        $result['schedLastAuthor'][] = $comment['schedAuthor'];
                        $result['schedLastTemp'][]   = $comment['schedComment'];

                        if ($comment['start_time']) {
                            $result['schedStart'] = $comment['start_time'];
                        }
                        if ($comment['end_time']) {
                            $result['schedEnd'] = $comment['end_time'];
                        }
                        if ($comment['duration']) {
                            $result['schedDuration'] = $comment['duration'];
                        }
                    }
                }

                if (count($result['schedComment']) > 1) {
                    $return = $this->removeDuplicates($result['downtime_id'], $result['schedComment']);

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

                $this->hosts[$host][$service]['comments'] = $result;
            }
        }
    }
    private function removeDuplicates($ids, $comments) {
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
                $this->actions->setType('downtime');
                $this->actions->runActions([[
                    'down_id' => $key,
                    'isHost'  => 'service',
                ]]);
            }
        }

        return $return;
    }
    private function otherFiles()
    {
        $this->alertsPercentile  = @unserialize(file_get_contents($this->alertsPercentile_global));
        $this->durationsFromFile = @unserialize(file_get_contents($this->durationsFromFile_global));
        $this->notesUrls         = $this->getNotesUrls();
        $this->depends           = $this->getDepends();
    }
    private function pregMatches()
    {
        $this->pregHostStatus = '/hoststatus {'.
            '[^{}]*?host_name=(?P<host>[^{}]*?)\n'.
            '[^{}]*?current_state=([^0])\n'.
            '[^{}]*?plugin_output=(?P<plugin_output>[^{}]*?)\n'.
            '[^{}]*?last_check=(?P<last_check>[^{}]*?)\n'.
            '[^{}]*?current_attempt=(?P<attempts>[^{}]*?)\n'.
            '[^{}]*?max_attempts=(?P<max_attempts>[^{}]*?)\n'.
            '[^{}]*?last_state_change=(?P<last_status_change>[^{}]*?)\n'.
            '.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
            '.*?scheduled_downtime_depth=(?P<scheduled>.*?)\n'.
            '[^{}]*?}/is';
        $this->pregHostDownComment = '/hostdowntime {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?downtime_id=(?P<downtime_id>.*?)\n'.
            '.*?entry_time=(?P<entry_time>.*?)\n'.
            '.*?author=(?P<author>.*?)\n'.
            '.*?comment=(?P<comment>.*?)\n'.
            '.*?}/is';
        $this->pregHostSchedComment = '/hostcomment {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?entry_type=(?P<entry_type>.*?)\n'.
            '.*?entry_time=(?P<entry_time>.*?)\n'.
            '.*?start_time=(?P<start_time>.*?)\n'.
            '.*?end_time=(?P<end_time>.*?)\n'.
            '.*?duration=(?P<duration>.*?)\n'.
            '.*?author=(?P<author>.*?)\n'.
            '.*?comment_data=(?P<comment>.*?)\n'.
            '.*?}/is';
        $this->pregHostComment = '/hostcomment {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?entry_type=(?P<entry_type>.*?)\n'.
            '.*?entry_time=(?P<entry_time>.*?)\n'.
            '.*?author=(?P<author>.*?)\n'.
            '.*?comment_data=(?P<comment>.*?)\n'.
            '.*?}/is';
        $this->pregServiceStatus  = '/servicestatus {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?service_description=(?P<service>.*?)\n'.
            '.*?current_state=(?P<state>.*?)\n'.
            '.*?current_attempt=(?P<attempts>.*?)\n'.
            '.*?max_attempts=(?P<max_attempts>.*?)\n'.
            '.*?last_state_change=(?P<last_status_change>.*?)\n'.
            '.*?plugin_output=(?P<plugin_output>.*?)\n'.
            '.*?last_check=(?P<last_check>.*?)\n'.
            '.*?next_check=(?P<next_check>.*?)\n'.
            '.*?active_checks_enabled=(?P<active_checks_enabled>.*?)\n'.
            '.*?problem_has_been_acknowledged=(?P<acked>.*?)\n'.
            '.*?scheduled_downtime_depth=(?P<scheduled>.*?)\n'.
            '.*?}/is';
        $this->pregServiceComment = '/servicecomment {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?service_description=(?P<service>.*?)\n'.
            '.*?entry_type=(?P<entry_type>.*?)\n'.
            '.*?entry_time=(?P<entry_time>.*?)\n'.
            '.*?author=(?P<author>.*?)\n'.
            '.*?comment_data=(?P<comment>.*?)\n'.
            '.*?}/is';
        $this->pregDowntimeComment = '/servicedowntime {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?service_description=(?P<service>.*?)\n'.
            '.*?downtime_id=(?P<downtime_id>.*?)\n'.
            '.*?entry_time=(?P<entry_time>.*?)\n'.
            '.*?start_time=(?P<start_time>.*?)\n'.
            '.*?end_time=(?P<end_time>.*?)\n'.
            '.*?duration=(?P<duration>.*?)\n'.
            '.*?author=(?P<author>.*?)\n'.
            '.*?comment=(?P<comment>.*?)\n'.
            '.*?}/is';
    }
    private function getNotesUrls() {
        if (file_exists($this->getNotesUrls_cacheFile) && (time() - filemtime($this->getNotesUrls_cacheFile)) < 3600) {
            return unserialize(file_get_contents($this->getNotesUrls_cacheFile));
        }

        $out = array();
        exec('egrep "description|notes_url" -r /etc/nagios/services/', $services);
        exec('egrep "host_name|notes_url" -r /etc/nagios/hosts', $hosts);

        foreach ($services as $k=>$el) {
            if (preg_match('/service_description\s+(.*?)$/', $el, $match)) {
                if (preg_match('/notes_url\s+(.*?)$/', $services[$k+1], $match2)) {
                    $out[$match[1]] = $match2[1];
                }
            }
        }

        foreach ($hosts as $k=>$el) {
            if (preg_match('/notes_url\s+(.*?)$/', $el, $match)) {
                if (preg_match('/host_name\s+(.*?)$/', $hosts[$k+1], $match2)) {
                    $out[$match2[1]] = $match[1];
                }
            }
        }

        file_put_contents($this->getNotesUrls_cacheFile, serialize($out));

        return $out;
    }
    private function getDepends() {
        if (file_exists($this->getDepends_cacheFile) && (time() - filemtime($this->getDepends_cacheFile)) < 3600) {
            return unserialize(file_get_contents($this->getDepends_cacheFile));
        }

        exec('egrep "description|notes" -r /etc/nagios/services/|grep -v notes_url', $o);
        $out = array();

        foreach ($o as $k=>$el) {
            if (preg_match('/service_description\s+(.*?)$/', $el, $match)) {
                if (preg_match('/notes\s+depends on (.*?)$/', $o[$k+1], $match2)) {
                    $out[$match[1]] = $match2[1];
                }
            }
        }

        file_put_contents($this->getDepends_cacheFile, serialize($out));

        return $out;
    }
    private function mergeComments($arrays) {
        $return = [];

        foreach ($arrays as $array) {
            foreach ($array as $host=>$data) {
                foreach ($data as $service=>$item) {
                    foreach ($item as $record) {
                        $return[$host][$service][] = $record;
                    }
                }
            }
        }

        return $return;
    }
    private function returnComments($comments, $statusFile, $isHost) {
        $return = [];

        if (preg_match_all($comments, $statusFile, $matches)) {
            foreach ($matches['host'] as $k=>$host) {
                if (isset($matches['downtime_id'])) {
                    $type = 'sched';
                    $id   = $matches['downtime_id'][$k];
                } else {
                    $type = ($matches['entry_type'][$k] == 2) ? 'other' : 'ack';
                    $id   = $matches['entry_type'][$k];
                }

                $name = ($isHost) ? 'SERVER IS UP' : $matches['service'][$k];

                if (isset($this->hosts[$host][$name])) {
                    $return[$host][$name][] = array(
                        'ackAuthor'        => ($type == 'ack')   ? $matches['author'][$k]     : '',
                        'ackComment'       => ($type == 'ack')   ? $matches['comment'][$k]    : '',
                        'ackCommentDate'   => ($type == 'ack')   ? $matches['entry_time'][$k] : '',
                        'schedAuthor'      => ($type == 'sched') ? $matches['author'][$k]     : '',
                        'schedComment'     => ($type == 'sched') ? $matches['comment'][$k]    : '',
                        'schedCommentDate' => ($type == 'sched') ? $matches['entry_time'][$k] : '',
                        'downtime_id'      => ($type != 'other') ? $id                        : '',
                        'start_time'       => ($type == 'sched') ? $matches['start_time'][$k] : '',
                        'end_time'         => ($type == 'sched') ? $matches['end_time'][$k]   : '',
                        'duration'         => ($type == 'sched') ? $matches['duration'][$k]   : '',
                    );
                }
            }
        }

        return $return;
    }
    private function verifyMatch($host, $service, $state, $scheduled, $last_status_change, $active_checks_enabled)
    {
        if ($this->returnDependency($host, $service)) {
            return false;
        }

        if (
                $state > 0
            || (!$state && isset($scheduled) && $scheduled)
            || (!$state && !$last_status_change && $active_checks_enabled)
            || $this->returnCriticalPercentileDuration($host, $service) > 4*3600
        ) {
            return true;
        }

        return false;
    }
    private function returnCriticalPercentileDuration($host, $service)
    {
        return (isset($this->alertsPercentile[$host.'_'.$service])) ? $this->alertsPercentile[$host.'_'.$service] : 0;
    }
    private function returnDependency($host, $service) {
        if ($pos = strpos(@$this->depends[$service], '$') && $pos !== false) {
            $parentService = @$this->hosts[substr($this->depends[$service], 0, $pos)][substr($this->depends[$service], $pos + 1)];
        } else {
            $parentService = @$this->hosts[$host][$this->depends[$service]];
        }

        if (isset($parentService['state']) && $parentService['state'] == 0) {
            return true;
        }

        return false;
    }
    private function returnNotesUrl($host, $service)
    {
        if ($service == 'SERVER IS UP') {
            $notesUrl   = (isset($this->notesUrls[$host])) ? $this->notesUrls[$host] : '';
        } else {
            $notesUrl   = (isset($this->notesUrls[$service])) ? $this->notesUrls[$service] : '';
        }

        if (preg_match("/zabbix_redirect/", $notesUrl)) {
            $notesUrl = strstr($notesUrl, 'host=', true) . "host={$host}&" . strstr($notesUrl, 'item=', false);
        }

        return $notesUrl;
    }
    private function setDurations($host, $service, $scheduled, $last_status_change)
    {
        $criticalPercentileDuration = $this->returnCriticalPercentileDuration($host, $service);

        if ($criticalPercentileDuration /*&& $criticalPercentileDuration > 60*4*/ && (!isset($scheduled) || !$scheduled) && $criticalPercentileDuration * 60 - (time() - $last_status_change) > 300) {
            $this->hosts[$host][$service]['durationSec'] = $criticalPercentileDuration * 60;
            $this->hosts[$host][$service]['duration']    = $this->duration($this->hosts[$host][$service]['durationSec'] * 60, false)." (50%)";
            $this->hosts[$host][$service]['origState']   = 'orig' . $this->hosts[$host][$service]['state'];
            $this->hosts[$host][$service]['state']       = 'CRITICAL';
        }
        else {
            $this->hosts[$host][$service]['durationSec'] = (isset($this->durationsFromFile[$host.'_'.$service]) and $this->durationsFromFile[$host.'_'.$service] * 60 < time() - $last_status_change) ? $this->durationsFromFile[$host.'_'.$service] * 60 : time() - $last_status_change;
            $this->hosts[$host][$service]['duration']    = $this->duration($this->hosts[$host][$service]['durationSec'], false);
        }
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

        $this->verificateCheck .= $host . $service . $item['state'] . $item['origState'] . $service;
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
        return str_replace('___host___', $host, $this->hostUrl);
    }
    private function serviceUrl($host, $service) {
        $service = str_replace('+', ' ', urlencode($this->parseToXML($service)));

        if ($service == 'SERVER IS UP' || $service == 'SERVER+IS+UP') {
            return $this->hostUrl($host);
        }

        return str_replace('___host___', $host, str_replace('___service___', $service, $this->serviceUrl));
    }
    private function returnRefreshArray()
    {
        $refreshArrayData = [];
        foreach ($this->refreshArray as $item) {
            $refreshArrayData[] = intval($item['value']) .','. $item['name'];
        }

        return implode(';', $refreshArrayData);
    }
    private function checkBackendStatus($lastCheck)
    {
        if (!$this->backendStatus && round(microtime(true) - $lastCheck) < 600) {
            $this->backendStatus = 'ok';
        }
    }
}