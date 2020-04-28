<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once __DIR__ . '/../scripts/init.php';

$planned = new planned;
$planned->server = (isset($_GET['server']) && $_GET['server']) ? $_GET['server'] : '';
$planned->serverTmp = (isset($_GET['server']) && $_GET['server']) ? $_GET['server'] : '';

if (!empty($_POST)) {
    $planned->host    = (isset($_POST['host'])) ? str_replace("\"", "&quot;", trim($_POST['host'])) : '';
    $planned->service = (isset($_POST['service'])) ? str_replace("\"", "&quot;", trim($_POST['service'])) : '';
    $planned->status  = (isset($_POST['status'])) ? str_replace("\"", "&quot;", trim($_POST['status'])) : '';
    $planned->comment = (isset($_POST['comment'])) ? trim($_POST['comment']) : '';
    $planned->time    = (isset($_POST['time'])) ? intval($_POST['time']) : 0;
    $planned->line    = (isset($_POST['line'])) ? trim($_POST['line']) : '';
    $planned->user    = (isset($_POST['user'])) ? trim($_POST['user']) : '';
    $planned->normal  = (isset($_POST['normal']) && $_POST['normal']) ? 1 : 0;
    $planned->xserver = (isset($_POST['xserver']) && $_POST['xserver']) ? trim($_POST['xserver']) : '';
    $planned->postServer = (isset($_POST['server']) && $_POST['server']) ? trim($_POST['server']) : '';

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

$planned->server = $planned->serverTmp;
$planned->recheckData();
http_response_code(200);

