<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once 'functions.php';

global $plannedUrl;

$file  = $plannedUrl;
$return = null;

if (!empty($_POST)) {
    $text = str_replace("\"", "&quot;", trim($_POST['text']));
    $time = intval($_POST['time']);
    $line = $_POST['line'];
    $user = $_POST['user'];
    $comment = $_POST['comment'];

    if (!$text || $time < 1) {
        http_response_code(400);
        die;
    }

    if ($line == 'new') {
        addData($file, $line, $text, $time, $user, $comment);
    } else if ($line == 'edit') {
        editData($_POST['old'], $_POST['new'], $comment);
    } else {
        removeData($file, $line);
    }
}

echo json_encode(recheckData($file), true);
http_response_code(200);

function addData($file, $line = false, $text = false, $time = false, $user, $comment = '') {
    $json = returnPlanned();

    if ($line == 'new') {
        $end = (time() + $time * 60);

        $json[] = [
            'command' => $text,
            'time'    => $time,
            'end'     => $end,
            'date'    => date('Y-m-d H:i:s', $end),
            'user'    => $user,
            'comment' => $comment,
        ];
    }

    writePlanned($json);
}

function removeData($file, $line) {
    $json = returnPlanned();

    $results = [];
    $delete  = null;

    foreach ($json as $key => $record) {
        if ($record['end'] > time() && $record['command'] != $line) {
            $results[] = $record;
        }

        if ($record['end'] > time() && $record['command'] == $line) {
            $delete = $record['command'];
        }
    }

    removePlannedMaintenance($delete);
    writePlanned($results);
}

function editData($old, $new, $comment) {
    $new     = ($new) ? $new : $old;
    $json    = returnPlanned();
    $results = [];

    foreach ($json as $key => $record) {
        if ($record['command'] == $old) {
            $record['command'] = $new;
            $record['comment'] = $comment;
        }

        $results[] = $record;
    }

    writePlanned($results);
}

function recheckData($file) {
    $json = returnPlanned();

    $results = [];

    foreach ($json as $record) {
        if ($record['end'] > time()) {
            $results[] = $record;
        }
    }

    writePlanned($results);

    global $plannedTemplates;

    return ['file' => $results, 'templates' => $plannedTemplates];
}