<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once __DIR__ . '/../scripts/init.php';

$longAlerts = new longAlerts();
global $db;

$return = [
    'last'    => $db->lastActionsList(),
    'planned' => $db->plannedActionsList(),
    'long'    => $longAlerts->returnLongAlerts(),
];

echo json_encode($return);

http_response_code(200);
die;

function getLastActionsList($query) {
    $results = [];

    exec($query, $output);

    foreach ($output as $record) {
        $item = explode("\t", $record);

        if ($item[0]) {
            $results[] = [
                'logged'  => trim($item[0]),
                'host'    => trim($item[1]),
                'service' => trim($item[2]),
                'command' => trim($item[3]),
                'author'  => trim($item[4]),
                'comment' => trim($item[5]),
            ];
        }
    }

    return $results;
}
