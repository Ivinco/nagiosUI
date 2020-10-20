<?php

class utils
{
    const BROWSER_TYPE_NAME = 'Browser';
    public $timeCorrectionDiff;
    public $timeCorrectionType;
    public $default_time_zone;

    function __construct() {
        global $timeZonesList;
        global $timeZonesListAliases;
        global $serversList;
        global $timeZone;
        global $memcacheEnabled;
        global $memcacheHost;
        global $memcachePort;
        global $memcacheName;
        global $db;

        $this->db              = $db;
        $this->memcacheEnabled = $memcacheEnabled;
        $this->memcacheHost    = $memcacheHost;
        $this->memcachePort    = $memcachePort;
        $this->memcacheName    = $memcacheName;

        if ($this->memcacheEnabled) {
            $this->memcache = new Memcache;
            $this->memcache->connect($this->memcacheHost, $this->memcachePort);
        }

        $this->default_time_zone = $timeZone;
        $this->timeZonesListAliases = $timeZonesListAliases;

        $this->setTimeZonesList($timeZonesList);
        $this->setServerTabsList($serversList);
        $this->setTimeCorrection();
    }

    public function getMemcache()
    {
        if ($this->memcacheEnabled) {
            return $this->memcache;
        }

        return null;
    }
    public function getMemcacheFullName($server) {
        if ($this->memcacheEnabled) {
            return "nagiosUI_{$this->memcacheName}_{$server}";
        }

        return null;
    }
    public function getMemcacheRecheckName($tab, $host, $service, $isHost)
    {
        $end = implode('_', [$tab, $host, $service, $isHost]);
        $end = md5($end);
        $name = $this->getMemcacheFullName($tab);

        return $name . "_" . $end;
    }

    public function getTimeZone($server)
    {
        $tz = $this->default_time_zone;

        if (isset($this->serversList[$server]) && isset($this->serversList[$server]['timeZone'])) {
            $tz = $this->serversList[$server]['timeZone'];
        }

        return $this->validateTimeZone($tz);
    }
    public function validateTimeZone($tz) {
        try {
            new DateTimeZone($tz);
        } catch(Exception $e) {
            return $this->default_time_zone;
        }

        return $tz;
    }
    public function returnCorrectedDate($requestDate, $serverName, $format = 'm-d-Y H:i:s', $checkMonth = false) {
        $serverTimeZone  = $this->getTimeZone($serverName);
        $requestTimeZone = $this->validateTimeZone($this->timeCorrectionType);

        $date = DateTime::createFromFormat($format, $requestDate, new DateTimeZone($serverTimeZone));
        $date->setTimeZone(new DateTimeZone($requestTimeZone));
        $date->modify($this->timeCorrectionDiff . ' minutes');

        if ($checkMonth && intval($date->format('n')) > intval(date('n'))) {
            $date->modify('-1 year');
        }

        return $date->format($format);
    }

    private function setTimeCorrection()
    {
        $this->timeCorrectionType = (isset($_GET['time_correction_type'])) ? $_GET['time_correction_type'] : '';
        $this->timeCorrectionType = urldecode($this->timeCorrectionType);
        $this->timeCorrectionType = $this->getTimeZoneWithAliases($this->timeCorrectionType);
        $this->timeCorrectionDiff = 0;

        if ($this->timeCorrectionType == self::BROWSER_TYPE_NAME && isset($_GET['time_correction_diff'])) {
            $this->timeCorrectionDiff = (int) $_GET['time_correction_diff'];
        }
    }

    private function getTimeZoneWithAliases($tz)
    {
        if (isset($this->timeZonesListAliases) && $this->timeZonesListAliases) {
            foreach ($this->timeZonesListAliases as $key => $value) {
                if ($value == $tz) {
                    return $key;
                }
            }
        }

        return $tz;
    }

    public function getTimeZonesList()
    {
        return $this->timeZonesList;
    }
    private function setTimeZonesList($timeZonesList)
    {
        if (isset($this->timeZonesListAliases) && $this->timeZonesListAliases) {
            $this->timeZonesList = array_values($this->timeZonesListAliases);
        } else {
            $this->timeZonesList = $timeZonesList;
        }

        $this->timeZonesList[] = 'UTC';
        $this->timeZonesList[] = self::BROWSER_TYPE_NAME;
        sort($this->timeZonesList);
    }

    public function getServerTabsListByUserServers($userServers)
    {
        $list = ['All'];

        foreach ($this->serverTabsList as $server) {
            if (in_array($server, $userServers)) {
                $list[] = $server;
            }
        }

        return $list;
    }
    public function getServerTabsList()
    {
        return $this->serverTabsList;
    }
    private function setServerTabsList($serversList) {
        $this->serversList    = $serversList;
        $this->serverTabsList = array_keys($serversList);
        sort($this->serverTabsList);
        array_unshift($this->serverTabsList, 'All');
    }

    private function getCommentUrl($server)
    {
        if (isset($this->serversList[$server]) && isset($this->serversList[$server]['commentUrl'])) {
            return $this->serversList[$server]['commentUrl'];
        }

        return "";
    }

    public function getCommentUrlList()
    {
        $return = [];

        foreach ($this->serversList as $server => $data) {
            if (isset($this->serversList[$server]['commentUrl'])) {
                $return[$server] = $this->serversList[$server]['commentUrl'];
            }
        }

        return $return;
    }

    public function parseUrls($string, $server) {
        $commentUrl = $this->getCommentUrl($server);

        $url = '@(http(s)?)?(://)?(([a-zA-Z])([-\w]+\.)+([^\s\.]+[^\s]*)+[^,.\s])@';
        $string = preg_replace($url, '<a href="http$2://$4" target="_blank" title="$0">$0</a>', $string);

        if ($commentUrl) {
            $string = preg_replace('/(([A-Z]{2,4}-\d+))/', $commentUrl, $string);
        }

        return $string;
    }

    public function prepareAckSchedComment($comment, $author, $date, $server)
    {
        $date = $this->returnCorrectedDate($date, $server, $format = 'Y-m-d H:i:s');
        $date = date_create($date);
        $date = date_format($date,'M j H:i');

        $result  = $this->parseUrls($comment, $server);
        $result  = "'{$result}' by {$author}";
        $result .= '<br />added: '. $date;

        return $result;
    }

    public function returnServerHostAndPort($server) {
        if (isset($this->serversList[$server]) && isset($this->serversList[$server]['url']) && isset($this->serversList[$server]['port'])) {
            return $this->serversList[$server]['url'] . ":" . $this->serversList[$server]['port'];
        }

        return $server;
    }

    public function returnUserNameAndEmail()
    {
        $usersArray = $this->db->returnUsersList();
        $user = (isset($_SERVER['PHP_AUTH_USER']) ? $_SERVER['PHP_AUTH_USER'] : '');
        $user = (!$user) ? ((isset($_SERVER['REDIRECT_REMOTE_USER']) ? $_SERVER['REDIRECT_REMOTE_USER'] : '')) : $user;

        if ($user && !array_key_exists($user, $usersArray)) {
            $this->db->insertUser([
                'name'       => $user,
                'email'      => $user,
                'full_name'  => $user,
                'server'     => '',
                'super_user' => '0', 
            ]);

            $usersArray = $this->db->returnUsersList();
        }

        $user = ($user && array_key_exists($user, $usersArray)) ? $user : 'default';

        return [$user, $usersArray[$user]];
    }
    private function returnAllUsersServers()
    {
        $usersList  = [];
        $usersArray = $this->db->returnFullUsersList();

        foreach ($usersArray as $item) {
            $name = $item['name'];

            if (!isset($usersList[$name])) {
                $usersList[$name] = [];
            }

            foreach ($item['server'] as $server) {
                if (!in_array($server, $usersList[$name])) {
                    $usersList[$name][] = $server;
                }
            }
        }

        return $usersList;
    }
    public function returnUserServers($user)
    {
        $usersList = $this->returnAllUsersServers();

        if (isset($usersList[$user])) {
            return $usersList[$user];
        }

        return [];
    }
}
