<?php
require 'api/config.php';
require 'api/db.php';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'session_data';
$_SESSION['user_id'] = 2;
$_SESSION['role'] = 'gm';
ob_start();
require 'api/gm.php';
$output = ob_get_clean();
echo "OUTPUT:\n$output\n";
