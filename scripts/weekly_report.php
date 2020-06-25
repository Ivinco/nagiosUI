<?php

include_once __DIR__ . '/init.php';
require_once __DIR__ . '/lib/vendor/autoload.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

$reports = new reports;
$reports->weeklyStats();