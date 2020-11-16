<?php

class fullInfo
{
    private $host;
    private $service;
    private $server;
    private $memcacheFullName;
    private $data;

    function __construct()
    {
        global $db;
        global $timeZone;

        $this->db       = $db;
        $this->utils    = new utils();
        $this->memcache = $this->utils->getMemcache();

        $this->tz = $timeZone;
    }

    public function run()
    {
        $this->setParams();
        $this->validate();
        $this->getData();
        $this->returnData();
    }

    private function returnData()
    {
        $check = ($this->service) ? $this->getCheck($this->service) : $this->getCheck('host data');
        $chart = ($this->service) ? $this->getServiceData() : [];

        echo json_encode(['check' => $check, 'chart' => $chart]);
    }

    private function getServiceData()
    {
        $this->setDates();
        $this->getChartData();

        return $this->setChartData();
    }
    private function returnStateNumber($state)
    {
        if ($state == 'warning') {
            return 1;
        }

        if ($state == 'critical') {
            return 2;
        }

        if ($state == 'unknown') {
            return 3;
        }

        return 0;
    }
    private function setDates()
    {
        $this->from = $this->getTs('from');
        $this->to   = $this->getTs('to');

        if (time() < $this->to) {
            $this->to = time();
        }

        $this->validateDates();

        $this->fromDate = $this->returnDateForDb($this->from);
        $this->toDate   = $this->returnDateForDb($this->to);
    }
    private function returnDateForDb($timestamp) {
        $diff = strtotime(gmdate("Y-m-d H:i:s")) - strtotime(date("Y-m-d H:i:s"));
        $timestamp -= $diff;

        $date = new DateTime("@{$timestamp}");
        $date->setTimezone(new DateTimeZone('UTC'));

        return $date->format('Y-m-d H:i:s');
    }
    private function getTs($name) {
        if (isset($_GET[$name])) {
            return (int) $_GET[$name];
        }

        return 0;
    }
    private function validateDates()
    {
        if (!$this->validateTimestamp($this->from)) {
            $this->returnError('"from" format must be timestamp');
        }
        if (!$this->validateTimestamp($this->to)) {
            $this->returnError('"to" format must be timestamp');
        }
        if (!$this->from || !$this->to) {
            $this->returnError('"from" and "to" must be set.');
        }
    }
    private function validateTimestamp($ts) {
        if ($ts && strlen((string) $ts) == 10 && strval($ts) == $ts) {
            return true;
        }

        return false;
    }

    private function getChartData()
    {
        $this->history = $this->db->historyGetUnfinishedAlertsWithPeriodAndHostAndService($this->fromDate, $this->toDate, $this->host, $this->service, $this->server);

        foreach ($this->history as $key => &$data) {
            $data['ts']    = strtotime($data['date']);
            $data['date']  = $this->utils->returnCorrectedDate($data['date'], $this->server, $format = 'Y-m-d H:i:s');
            $data['state'] = $this->returnStateNumber($data['state']);
        }

        $prevState = null;

        foreach ($this->history as $key => &$data) {
            if (is_null($prevState)) {
                $prevState = $data['state'];

                continue;
            }

            if ($data['state'] == $prevState) {
                $prevState = $data['state'];
                unset($this->history[$key]);

                continue;
            }

            $prevState = $data['state'];
        }
    }
    private function setChartData()
    {
        return [
            'from'  => $this->from * 1000,
            'to'    => $this->to * 1000,
            'chart' => $this->history,
        ];
    }

    private function getCheck($service)
    {
        if (!isset($this->data[$this->host]) || !isset($this->data[$this->host][$service])) {
            $this->returnError('Check not found');
        }

        $check = $this->data[$this->host][$service];
        $check['date'] = $this->utils->returnCorrectedDate($check['date'], $check['tab']);

        return $check;
    }

    private function setParams()
    {
        $this->setServer();
        $this->setHost();
        $this->setService();
        $this->setMemcacheName();
    }
    private function getData()
    {
        $this->data = $this->memcache->get($this->memcacheFullName);
        $this->data = unserialize($this->data);

        if (!$this->data) {
            $this->returnError('No data in memcache');
        }
    }
    private function validate()
    {
        if (!$this->memcacheFullName) {
            $this->returnError('Memcache is disabled');
        }

        if (!$this->host) {
            $this->returnError('Host is not set');
        }
    }
    private function returnError($text) {
        echo json_encode(['error' => $text]);
        die;
    }

    private function setServer()
    {
        $server = $this->getParam('server_tab');

        if ($server && in_array($server, $this->utils->getServerTabsList())) {
            $this->server = $server;
        } else {
            $this->server = 'All';
        }
    }
    private function setHost()
    {
        $this->host = urldecode($this->getParam('host'));
    }
    private function setService()
    {
        $this->service = urldecode($this->getParam('service'));
    }
    private function setMemcacheName()
    {
        $name = $this->utils->getMemcacheFullName($this->server);

        if ($name) {
            $this->memcacheFullName = $name . "_full_info";
        }
    }
    private function getParam($param)
    {
        $value = (isset($_GET[$param])) ? $_GET[$param] : '';
        $value = trim($value);

        return $value;
    }
}
