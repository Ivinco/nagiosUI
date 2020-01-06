<?php

include_once __DIR__ . '/init.php';

if ($memcacheEnabled) {
    $lockName = (isset($argv[1]) && $argv[1]) ? $argv[1] : "nagios-ui";
    $lockPath = __DIR__ . "/../config/";
    $lockFile = $lockPath . $lockName . ".lck";

    while (false === lock($lockFile)) {
        die(date("Y-m-d H:i:s") . " Couldn't lock the file!\n");
    }
}

function lock($filename) {

    $fp = fopen($filename, "w+");
    if (!$fp) die(date("Y-m-d H:i:s") . " Unable to create lock file.\n");

    $r = flock($fp, LOCK_EX | LOCK_NB,$l);

    if ($r & !$l) {
        $servers = getServersList();
        foreach ($servers as $server) {
            $xml = new xml;
            $xml->getDataFromMemcache = false;
            $xml->setCurrentTab($server);
            $xml->returnXml(false);
        }

        flock($fp, LOCK_UN);
        unlink($filename);
        fclose($fp);
        exit();
    } else {
        fclose($fp);
        return false;
    }
}

function getServersList() {
    global $serversList;

    $servers = array_keys($serversList);
    $servers[] = 'All';

    return $servers;
}

