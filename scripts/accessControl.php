<?php

class accessControl
{
    private $accessControl;
    private $superUsers;
    private $server;
    private $accessControlServices;

    function __construct($server)
    {
        global $accessControl;

        include_once __DIR__ . '/../htdocs/config/config.php';

        $this->db = new db;
        $this->accessControl = $accessControl;
        $this->server = $server;
        $this->superUsers = $this->db->getSuperUsers($this->server);
        $this->accessControlServices = $this->db->getAccessList($this->server);
    }

    public function verifyUser($service, $user)
    {
        if (!$this->accessControl) {
            return true;
        }

        if (in_array($user, $this->superUsers)) {
            return true;
        }

        if (isset($this->accessControlServices[$user]) && in_array($service, $this->accessControlServices[$user])) {
            return true;
        }

        return false;
    }
}