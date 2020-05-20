<?php

class recheck
{
    function __construct()
    {
        global $memcacheEnabled;
        global $memcacheHost;
        global $memcachePort;
        global $memcacheName;

        $this->memcacheEnabled = $memcacheEnabled;
        $this->memcacheHost    = $memcacheHost;
        $this->memcachePort    = $memcachePort;
        $this->memcacheName    = $memcacheName;
        $this->actions         = new actions;

        if ($this->memcacheEnabled) {
            $this->memcache = new Memcache;
            $this->memcache->connect($this->memcacheHost, $this->memcachePort);
        }

        $this->setmemcacheFullName();
    }

    private function setmemcacheFullName() 
    {
        if ($this->memcacheEnabled) {
            $this->memcacheFullName = "nagiosUI_{$this->memcacheName}_All";
        }
    }

    public function getRecheckStatus()
    {
        $checking = 0;

        if ($this->memcacheEnabled) {
            if ($this->memcache->get($this->memcacheFullName . "_recheck")) {
                $checking = 1;
            }
        }

        echo json_encode(['checking' => $checking]);
    }

    public function setRecheckStatus()
    {
        if (!$this->memcache->get($this->memcacheFullName . "_recheck")) {
            $this->memcache->set($this->memcacheFullName . "_recheck", true, 0, 600);

            $this->getUnhandledAlerts();
            $this->forceCronPhp();
        }
    }

    private function getUnhandledAlerts()
    {
        $xml = new xml;
        $xml->setCurrentTab('All');
        $alerts = json_decode(json_encode(simplexml_load_string($xml->returnXml(false))),TRUE);

        if (!isset($alerts['alert'])) {
            return;
        }

        $commands = [];

        foreach ($alerts['alert'] as $item) {
            $state           = (!is_array($item['@attributes']['state'])) ? $item['@attributes']['state'] : implode(' ', $item['@attributes']['state']);
            $acked           = (!is_array($item['acked']))                ? $item['acked']                : implode(' ', $item['acked']);
            $sched           = (!is_array($item['sched']))                ? $item['sched']                : implode(' ', $item['sched']);
            $tempCommen      = (!is_array($item['ack_last_temp']))        ? $item['ack_last_temp']        : implode(' ', $item['ack_last_temp']);
            $tab             = (!is_array($item['tab']))                  ? $item['tab']                  : implode(' ', $item['tab']);
            $host            = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
            $service         = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
            $hostOrService   = $item['host_or_service'];

            if (($state != 'OK') && ((!$acked && !$sched && $state != 'OK') || ($acked && $tempCommen == 'temp'))) {
                if (!isset($commands[$tab])) {
                    $commands[$tab] = [];
                }

                $commands[$tab][] = [
                    'host'    => $host,
                    'service' => $service,
                    'tab'     => $tab,
                    'isHost'  => $hostOrService,
                ];
            }
        }

        foreach ($commands as $server => $data) {
            $this->actions->setType('recheckIt');
            $this->actions->setServer($server);
            $this->actions->runActions($data);
        }
    }
    private function forceCronPhp()
    {
        global $serversList;

        $servers = array_keys($serversList);
        $servers[] = 'All';

        foreach ($servers as $server) {
            $xml = new xml;
            $xml->getDataFromMemcache = false;
            $xml->setCurrentTab($server);
            $xml->returnXml(false);
        }

        $this->memcache->delete($this->memcacheFullName . "_recheck");
    }
}
