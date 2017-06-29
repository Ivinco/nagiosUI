<?php

class accessControl
{
    private $accessControl;
    private $accessControlSuperUsers;
    private $accessControlGroupUrl;
    private $accessControlGroup;
    private $accessControlServiceUrl;
    private $accessControlService;
    private $memcache;

    function __construct()
    {
        include_once __DIR__ . '/../htdocs/config/config.php';

        global $accessControl;

        if ($accessControl) {
            global $accessControlSuperUsers;
            global $accessControlGroupUrl;
            global $accessControlServiceUrl;

            global $memcacheEnabled;
            global $memcacheHost;
            global $memcachePort;
            global $memcacheName;

            if ($memcacheEnabled) {
                $this->memcache = new Memcache;
                $this->memcache->connect($memcacheHost, $memcachePort);
            }

            if ($memcacheEnabled && $this->memcache->get("nagiosUI_{$memcacheName}_accessControl")) {
                $this->accessControlService = json_decode($this->memcache->get("nagiosUI_{$memcacheName}_accessControl"));
            } else {
                $this->accessControl           = $accessControl;
                $this->accessControlSuperUsers = self::clearArray($accessControlSuperUsers);
                $this->accessControlGroupUrl   = $accessControlGroupUrl;
                $this->accessControlGroup      = self::returnGroups();
                $this->accessControlServiceUrl = $accessControlServiceUrl;
                $this->accessControlService    = self::returnServices();

                if ($memcacheEnabled) {
                    $this->memcache->set("nagiosUI_{$memcacheName}_accessControl", json_encode($this->accessControlService), 0, 300);
                }
            }
        }
    }

    public function verifyUser($service, $user)
    {
        if (!$this->accessControl) {
            return true;
        }

        if ($this->accessControl && isset($this->accessControlService[$service]) && in_array($user, $this->accessControlService[$service])) {
            return true;
        }

        return false;
    }
    private function returnServices()
    {
        exec('egrep "service_description|contact_groups|contacts" -r ' . $this->accessControlServiceUrl, $servicesAll);
        $servicesList = [];

        foreach ($servicesAll as $k=>$el) {
            if (preg_match('/service_description\s+(.*?)$/', $el, $match)) {
                $serviceGroup = [];
                if (isset($servicesAll[$k+1]) && preg_match('/contact_groups\s+(.*?)$/', $servicesAll[$k+1], $match1)) {
                    $serviceGroup = self::returnServiceGroupUsers(explode(',', $match1[1]));
                }

                $serviceUser = [];
                if (isset($servicesAll[$k+1]) && preg_match('/contacts\s+(.*?)$/', $servicesAll[$k+1], $match1)) {
                    $serviceUser = self::clearArray(explode(',', $match1[1]));
                }

                $users = array_merge($serviceGroup, $serviceUser, $this->accessControlSuperUsers);
                $servicesList[$match[1]] = array_unique($users);
            }
        }

        return $servicesList;
    }
    private function returnServiceGroupUsers($groups)
    {
        $users  = [];
        $groups = self::clearArray($groups);

        foreach ($groups as $group) {
            if (isset($this->accessControlGroup[$group])) {
                $users = array_merge($users, $this->accessControlGroup[$group]);
            }
        }

        return $users;
    }
    private function returnGroups()
    {
        exec('egrep "contactgroup_name|members" -r ' . $this->accessControlGroupUrl, $groupAll);
        $groupList = [];

        foreach ($groupAll as $k=>$el) {
            if (preg_match('/contactgroup_name\s+(.*?)$/', $el, $match)) {
                $usersList = [];

                if (isset($groupAll[$k+1]) && preg_match('/members\s+(.*?)$/', $groupAll[$k+1], $match1)) {
                    foreach (explode(',', $match1[1]) as $oneUser) {
                        if (trim($oneUser)) {
                            $usersList[] = trim($oneUser);
                        }
                    }
                }

                if (count($usersList)) {
                    $groupList[$match[1]] = $usersList;
                }
            }
        }

        return $groupList;
    }
    private function clearArray($array)
    {
        $results = [];

        foreach ($array as $item) {
            if (trim($item)) {
                $results[] = trim($item);
            }
        }

        return $results;
    }

}