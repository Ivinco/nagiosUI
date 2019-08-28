<?php

include_once __DIR__ . '/init.php';

if ($memcacheEnabled) {
    $memcache = new Memcache;
    $memcache->connect($memcacheHost, $memcachePort);

    $servers = array_keys($serversList);
    $servers[] = 'All';

    foreach ($servers as $server) {
        $xml = new xml;
        $xml->getDataFromMemcache = false;
        $xml->setCurrentTab($server);
        $xml->returnXml(false, '');

    }
}
