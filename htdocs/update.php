<?php

set_time_limit(0);
ignore_user_abort(false);

if (!isset($_GET['hash']) || !$_GET['hash']) {
    http_response_code(404);
    die;
}

$counter = 0;

include_once __DIR__ . '/../scripts/init.php';
$xml = new xml;

while (!connection_aborted() and connection_status() == CONNECTION_NORMAL) {
    if ($counter > 120) {
        http_response_code(408);
        break;
    }
    
    clearstatcache();

    $lastFileHash = $xml->returnXml(true, false);

    if ($lastFileHash != $_GET['hash']) {
        echo $lastFileHash;
        break;
    } else {
        sleep(1);
        $counter++;
        continue;
    }
}
