<?php

include_once __DIR__ . '/../scripts/init.php';

$xml     = new xml;
$xml->setCurrentTab((isset($_GET['server_tab'])) ? $_GET['server_tab'] : '');

ob_start('ob_gzhandler');
header("Content-Type: application/xml");

echo $xml->returnXml(false);