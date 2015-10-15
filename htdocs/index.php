<?php

include_once 'functions.php';

ob_start("ob_gzhandler");
header('Content-Type: application/xml');
echo returnDataList(false);


