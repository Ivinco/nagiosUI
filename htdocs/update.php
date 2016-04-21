<?php

set_time_limit(0);

if (!isset($_GET['hash']) || !$_GET['hash']) {
    http_response_code(404);
    die;
}

$counter = 0;

include_once 'functions.php';

while (true) {
    if ($counter > 120) {
        http_response_code(408);
        break;
    }
    
    clearstatcache();
    $lastFileHash = returnDataList(true, false);

    if ($lastFileHash != $_GET['hash']) {
        echo $lastFileHash;
        break;
    } else {
        sleep(1);
        $counter++;
        continue;
    }
}
