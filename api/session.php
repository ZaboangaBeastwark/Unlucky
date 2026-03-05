<?php
// api/session.php

// Ensure session cookie is accessible throughout the entire domain
if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
        'lifetime' => 3600,
        'path' => '/',
        'domain' => '', // Use current domain
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
} else {
    session_set_cookie_params(3600, '/; samesite=Lax');
}

ini_set('session.gc_maxlifetime', 3600);
session_start();

// Helper to check if user is GM
function requireGM()
{
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'gm') {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized. GM access required.']);
        exit;
    }
}

