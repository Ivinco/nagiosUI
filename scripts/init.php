<?php

include_once __DIR__ . '/../htdocs/config/config.php';
include_once __DIR__ . '/utils.class.php';
include_once __DIR__ . '/accessControl.php';
include_once __DIR__ . '/planned.php';
include_once __DIR__ . '/xml.php';
include_once __DIR__ . '/longAlerts.class.php';
include_once __DIR__ . '/actions.php';
include_once __DIR__ . '/json.class.php';
include_once __DIR__ . '/db.class.php';
include_once __DIR__ . '/stats.class.php';
include_once __DIR__ . '/calendar.class.php';
include_once __DIR__ . '/recheck.class.php';
include_once __DIR__ . '/emergency.class.php';
include_once __DIR__ . '/reports.class.php';
include_once __DIR__ . '/aggregated_stats.class.php';
include_once __DIR__ . '/synchronize_notes.class.php';
include_once __DIR__ . '/users.class.php';

function logText($text) {
    $date = date("Y-m-d H:i:s");
    $pid  = posix_getpid();
    $file = '';
    $backtrace = debug_backtrace();

    foreach ($backtrace as $call) {
        if (isset($call['file'])) {
            $file = pathinfo($call['file'], PATHINFO_BASENAME);

            break;
        }
    }

    echo "{$date} [pid {$pid}] {$file}: {$text}\n";
}
