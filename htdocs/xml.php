<?php

include_once __DIR__ . '/../scripts/init.php';

$xmlFile = (isset($_GET['file'])) ? $_GET['file'] : '';
$xml     = new xml;

if ($xmlFile && !$xml->verifyXmlArchive()) {
    $xml->dieXmlArchiveNotFound();
}

ob_start('ob_gzhandler');
header("Content-Type: application/xml");

echo $xml->returnXml(false, $xmlFile);