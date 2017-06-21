<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once 'functions.php';

$planned = new planned;

if (!empty($_POST)) {
    $planned->host    = (isset($_POST['host'])) ? str_replace("\"", "&quot;", trim($_POST['host'])) : '';
    $planned->service = (isset($_POST['service'])) ? str_replace("\"", "&quot;", trim($_POST['service'])) : '';
    $planned->comment = (isset($_POST['comment'])) ? trim($_POST['comment']) : '';
    $planned->time    = (isset($_POST['time'])) ? intval($_POST['time']) : 0;
    $planned->line    = (isset($_POST['line'])) ? trim($_POST['line']) : '';
    $planned->user    = (isset($_POST['user'])) ? trim($_POST['user']) : '';

    $action = (isset($_POST['text'])) ? trim($_POST['text']) : '';
    $old    = (isset($_POST['old'])) ? trim($_POST['old']) : '';

    if ($action == 'delete') {
        $planned->removeData();
    } else if ($action == 'comment') {
        $planned->changeComment();
    } else {
        if ($planned->verifyPostData()) {
            http_response_code(400);
            die;
        }

        if ($planned->line == 'new') {
            $planned->addData();
        } else if ($planned->line == 'edit') {
            $planned->editData($old);
        }
    }
}

$planned->recheckData();
http_response_code(200);

