<?php

include_once __DIR__ . '/../scripts/init.php';

ob_start('ob_gzhandler');
header("Content-Type: application/xml");

$xmlFile = (isset($_GET['file'])) ? $_GET['file'] : '';

$xml = new xml;

echo $xml->returnXml(false, $xmlFile);