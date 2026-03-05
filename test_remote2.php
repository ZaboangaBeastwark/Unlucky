<?php
require 'api/config.php';
require 'api/db.php';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'session_data';
session_start();
$_SESSION['user_id'] = 2; // Zaboanga
$_SESSION['role'] = 'gm';
ob_start();
require 'api/gm.php';
$out = ob_get_clean();
echo $out;
