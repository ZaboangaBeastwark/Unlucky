<?php
ini_set('session.gc_maxlifetime', 3600);
session_set_cookie_params(3600, '/'); // Explicitly set path to root
session_start();
header('Content-Type: application/json');
echo json_encode([
    'session' => $_SESSION,
    'cookie' => $_COOKIE,
    'session_id' => session_id(),
    'php_version' => PHP_VERSION,
    'server_name' => $_SERVER['SERVER_NAME'],
    'http_host' => $_SERVER['HTTP_HOST'],
    'script_name' => $_SERVER['SCRIPT_NAME'],
    'remote_addr' => $_SERVER['REMOTE_ADDR']
], JSON_PRETTY_PRINT);
