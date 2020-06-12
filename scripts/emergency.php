<?php

include_once __DIR__ . '/../scripts/init.php';

if (isset($argv[1]) && $argv[1] == '--test') {
    if (isset($argv[2]) && $argv[2]) {
        $e = new emergency();
        $e->runTest($argv[2]);
    } else {
        echo date("Y-m-d H:i:s") . " Please add your phone!\n";
        exit(1);
    }
} else {
    $lockName = "nagios-ui-emergency";
    $lockPath = __DIR__ . "/../config/";
    $lockFile = $lockPath . $lockName . ".lck";

    while (false === lock($lockFile)) {
        echo date("Y-m-d H:i:s") . " Couldn't lock the file!\n";
        exit(1);
    }
}

function lock($filename) {
    $fp = @fopen($filename, "w+");
    if (!$fp) {
        echo date("Y-m-d H:i:s") . " Unable to create lock file. Lock is already set.\n";
        exit(1);
    }

    $r = flock($fp, LOCK_EX | LOCK_NB,$l);

    if ($r & !$l) {
        $e = new emergency();
        $e->run();

        flock($fp, LOCK_UN);
        unlink($filename);
        fclose($fp);
    } else {
        fclose($fp);
        return false;
    }
}
