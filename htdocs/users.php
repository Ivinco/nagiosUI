<?php

ob_start('ob_gzhandler');
header('Content-Type: application/json');

include_once __DIR__ . '/../scripts/init.php';

$users = new users;

if (isset($_GET['action']) && $_GET['action'] == 'save-user') {
    echo json_encode($users->saveUser());
} else if (isset($_GET['action']) && $_GET['action'] == 'delete-user') {
    echo json_encode($users->deleteUser());
} else if (isset($_GET['action']) && $_GET['action'] == 'insert-user') {
    echo json_encode($users->insertUser());
} else {
    echo json_encode($users->usersList());
}

/*if (isset($_GET['run']) && $_GET['run']) {
    $recheck->setRecheckStatus();
} else {
    $recheck->getRecheckStatus();
}*/

http_response_code(200);
die;