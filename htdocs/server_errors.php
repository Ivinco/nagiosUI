<?php

include_once __DIR__ . '/../scripts/init.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$utils = new utils;
$serversList = $utils->getServerTabsList();
$server = (isset($_GET['server_tab'])) ? $_GET['server_tab'] : '';
$memcache = $utils->getMemcache();
$results = "";

if ($memcache && $server && in_array($server, $serversList)) {
    $memcacheName = $utils->getMemcacheFullName($server);
    $memcacheName .= '_errors';

    $errors = $memcache->get($memcacheName);

    if ($errors) {
        $results = json_decode($errors);
    }
}

echo json_encode($results);
http_response_code(200);
die;
