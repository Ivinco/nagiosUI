<?php

set_time_limit(0);

include_once 'functions.php';

while (true) {
    clearstatcache();
    $lastFileHash = returnDataList(true); 

    if (isset($_GET['hash']) && $lastFileHash != $_GET['hash']) {
        echo $lastFileHash;
        break;
    } else {
        sleep(1);
        continue;
    }
}
