// api/session.php

// Define session name to avoid conflicts
session_name('UNLUCKY_SESSION');

// Ensure session cookie is accessible throughout the entire domain
if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
        'lifetime' => 86400, // 24 hours
        'path' => '/',
        'domain' => '', // Use current domain
        'secure' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
} else {
    session_set_cookie_params(86400, '/; samesite=Lax');
}

ini_set('session.gc_maxlifetime', 86400);

// Only start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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

