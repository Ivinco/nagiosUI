<?php

include_once __DIR__ . '/../scripts/init.php';

$actions = new actions;
$actions->verifyType();
$actions->runActions($_REQUEST['data']);

echo "finished";
http_response_code(200);
