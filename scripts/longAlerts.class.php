<?php

class longAlerts
{
    function __construct()
    {
        global $memcacheEnabled;
        global $memcacheHost;
        global $memcachePort;
        global $memcacheName;
        global $longAlertsConfig;

        $this->longAlertsConfig = $longAlertsConfig;
        $this->memcacheEnabled  = $memcacheEnabled;
        $this->memcacheHost     = $memcacheHost;
        $this->memcachePort     = $memcachePort;
        $this->memcacheName     = $memcacheName;
        $this->memcache         = null;
    }

    private function enabled()
    {
        if (isset($this->longAlertsConfig) && isset($this->longAlertsConfig['enable_notification']) && $this->longAlertsConfig['enable_notification']) {
            $this->json     = new json;
            $this->jsonData = $this->json->returnJson;
            $this->states   = $this->returnStatesArray();
            $this->duration = $this->returnDuration();
            $this->reNotify = $this->returnReNotify();

            if ($this->memcacheHost && $this->memcachePort) {
                $this->memcache = new Memcache;
                $this->memcache->connect($this->memcacheHost, $this->memcachePort);
            }

            return true;
        }

        return false;
    }
    public function returnLongAlerts()
    {
        if ($this->enabled()) {
            return $this->checkAlerts();
        }

        return [];
    }
    private function checkAlerts()
    {
        $results = [];

        foreach ($this->jsonData as $alert) {
            $host    = $alert['host']['name'];
            $service = $alert['service']['name'];
            $status  = $alert['status']['name'];
            $key     = "nagios_notifications_".md5("{$host}_{$service}_{$status}");

            if (   !$alert['comment']['ack']
                && !$alert['comment']['sched']
                && in_array($status, $this->states)
                && !$alert['service']['info']
                && !$this->getMemcached($key)
                && (int)$alert['duration']['order'] >= $this->duration
            ) {
                $this->setMemcached($key);
                $results[] = "Hey. There's alert on '$host' - '$service ({$alert['info']['name']})'. It has not been acknowledged for more than ".($this->duration/60)." min, please look into that ASAP\n";
            }
        }

        return $results;
    }
    private function setMemcached($key)
    {
        if ($this->memcache) {
            $this->memcache->set($key, true, 0, $this->reNotify);
        }
    }
    private function getMemcached($key)
    {
        if ($this->memcache) {
            return $this->memcache->get($key);
        }

        return false;
    }
    private function returnStatesArray()
    {
        if (isset($this->longAlertsConfig['notify_about_states']) && is_array($this->longAlertsConfig['notify_about_states'])) {
            return $this->longAlertsConfig['notify_about_states'];
        }

        return [];
    }
    private function returnDuration()
    {
        if (isset($this->longAlertsConfig['notify_about_alerts_longer_than']) && $this->longAlertsConfig['notify_about_alerts_longer_than']) {
            return $this->longAlertsConfig['notify_about_alerts_longer_than'];
        }

        return 30 * 60;
    }
    private function returnReNotify()
    {
        if (isset($this->longAlertsConfig['remember_notification_for']) && $this->longAlertsConfig['remember_notification_for']) {
            return $this->longAlertsConfig['remember_notification_for'];
        }

        return 30 * 60;
    }
}
