<?php
// api/logs.php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Not authenticated'], 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sessionId = $_GET['session_id'] ?? null;
    $lastLogId = $_GET['last_id'] ?? 0;

    if (!$sessionId) {
        jsonResponse(['error' => 'Session ID required'], 400);
    }

    // Fetch recent logs
    $stmt = $pdo->prepare('SELECT * FROM action_logs WHERE session_id = ? AND id > ? ORDER BY id ASC LIMIT 50');
    $stmt->execute([$sessionId, $lastLogId]);
    $logs = $stmt->fetchAll();

    jsonResponse(['logs' => $logs]);
}

jsonResponse(['error' => 'Invalid method'], 405);
