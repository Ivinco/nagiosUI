<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once 'functions.php';

$planned = new planned;

if (!empty($_POST)) {
    $planned->host    = str_replace("\"", "&quot;", trim($_POST['host']));
    $planned->service = str_replace("\"", "&quot;", trim($_POST['service']));
    $planned->comment = trim($_POST['comment']);
    $planned->time    = intval($_POST['time']);
    $planned->line    = trim($_POST['line']);
    $planned->user    = trim($_POST['user']);

    if (trim($_POST['text']) == 'delete') {
        $planned->removeData();
    } else if (trim($_POST['text']) == 'comment') {
        $planned->changeComment();
    } else {
        if ($planned->verifyPostData()) {
            http_response_code(400);
            die;
        }

        if ($planned->line == 'new') {
            $planned->addData();
        } else if ($planned->line == 'edit') {
            $planned->editData(trim($_POST['old']));
        }
    }
}

$planned->recheckData();
http_response_code(200);

