<?php

include_once __DIR__ . '/../scripts/init.php';

if (isset($argv[1]) && $argv[1] == '--test') {
    if (isset($argv[2]) && $argv[2]) {
        $e = new emergency();
        $e->runTest($argv[2]);
    } else {
        logText("Please add your phone!");
        exit(1);
    }
} else if (isset($argv[1]) && $argv[1] == '--import') {
    $e = new emergency();
    $e->import();
} else {
    $lockName = "nagios-ui-emergency";
    $lockPath = __DIR__ . "/../config/";
    $lockFile = $lockPath . $lockName . ".lck";

    while (false === lock($lockFile)) {
        logText("Couldn't lock the file!");
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
