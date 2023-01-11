<?php

include_once __DIR__ . '/../init.php';

if ($memcacheEnabled) {
    $hosts    = [];
    $fullInfo = [];
    $lockName = (isset($argv[1]) && $argv[1]) ? $argv[1] : "nagios-ui";
    $lockPath = __DIR__ . "/../../config/";
    $lockFile = $lockPath . $lockName . ".lck";

    while (false === lock($lockFile)) {
        //logText("Couldn't lock the file!");
        exit(1);
    }
}

function lock($filename) {

    $fp = @fopen($filename, "w+");
    if (!$fp) {
        logText("Unable to create lock file. Lock is already set.");
        exit(1);
    }

    $r = flock($fp, LOCK_EX | LOCK_NB,$l);

    if ($r & !$l) {
        $start = time();
        logText("Started");
        $servers = getServersList();
        foreach ($servers as $server) {
            setAlerts($server);
        }

        flock($fp, LOCK_UN);
        unlink($filename);
        fclose($fp);
        logText("Finished in ". (time() - $start) ."s");
        exit();
    } else {
        fclose($fp);
        return false;
    }
}

function setAlerts($server) {
    global $hosts;
    global $fullInfo;

    $xml = new xml;
    $xml->getDataFromMemcache = false;
    $xml->setCurrentTab($server);

    if ($server == 'All') {
        $xml->addDataAllToMemcache();
    } else {
        $xml->returnXml(false);
        $hosts[] = $xml->returnHosts();
        $fullInfo[] = $xml->returnFullInfo();
    }
}

function getServersList() {
    global $serversList;

    $servers = array_keys($serversList);
    $servers[] = 'All';

    return $servers;
}

