<?php
// api/session.php

// Ensure session cookie is accessible throughout the entire domain
// 30 days persistence
$session_lifetime = 2592000; 

if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
        'lifetime' => $session_lifetime,
        'path' => '/',
        'domain' => '', 
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
} else {
    session_set_cookie_params($session_lifetime, '/; samesite=Lax');
}

ini_set('session.gc_maxlifetime', $session_lifetime);
session_name('PHPSESSID');
session_start();

// releases the lock and allows parallel requests from multiple tabs.
session_write_close();

// Helper to check if user is GM
function requireGM()
{
    if (!isset($_SESSION['user_id'])) {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated.']);
        exit;
    }
    if ($_SESSION['role'] !== 'gm') {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized. GM access required.']);
        exit;
    }
}
