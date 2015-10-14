<?php

set_time_limit(0);
include_once 'config/nagios2Config.php';

while (true) {
    $last_ajax_call = isset($_GET['timestamp']) ? (int)$_GET['timestamp'] : null;
    clearstatcache();
    $last_change_in_data_file = filemtime($statusFile_global); 

    if ($last_change_in_data_file > $last_ajax_call) {
        echo $last_change_in_data_file;
        break;
    } else {
        sleep(1);
        continue;
    }
}