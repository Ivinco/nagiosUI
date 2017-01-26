<?php

include_once 'functions.php';

if (!isset($_SESSION)) {
    session_start();
}

ob_start('ob_gzhandler');
header("Content-Type: application/xml");

echo returnMemcacheData(false);