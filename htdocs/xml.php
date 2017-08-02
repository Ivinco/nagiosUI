<?php

include_once __DIR__ . '/../scripts/init.php';

ob_start('ob_gzhandler');
header("Content-Type: application/xml");

$xml = new xml;

echo $xml->returnXml(false, false);