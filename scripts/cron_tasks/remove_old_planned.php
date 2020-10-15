<?php

include_once __DIR__ . '/../init.php';

$lockName = "nagios-ui-remove_old_planned";
$lockPath = __DIR__ . "/../../config/";
$lockFile = $lockPath . $lockName . ".lck";

while (false === lock($lockFile)) {
    echo date("Y-m-d H:i:s") . " Couldn't lock the file!\n";
    exit(1);
}

function lock($filename) {
    $fp = @fopen($filename, "w+");
    if (!$fp) {
        echo date("Y-m-d H:i:s") . " Unable to create lock file. Lock is already set.\n";
        exit(1);
    }

    $r = flock($fp, LOCK_EX | LOCK_NB,$l);

    if ($r & !$l) {
        $start = time();
        echo date("Y-m-d H:i:s") . " Started\n";

        $planned = new planned();
        $planned->removeOldPlanned();

        flock($fp, LOCK_UN);
        unlink($filename);
        fclose($fp);
        echo date("Y-m-d H:i:s") . " Finished in ". (time() - $start) ."s\n";
    } else {
        fclose($fp);
        return false;
    }
}
