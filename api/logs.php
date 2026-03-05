<?php
// api/logs.php
require_once __DIR__ . '/session.php';
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
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['action'] ?? '') === 'delete') {
        if ($_SESSION['role'] !== 'gm') {
            jsonResponse(['error' => 'Apenas Mestres podem excluir registros'], 403);
        }
        $logId = $input['id'] ?? null;
        if (!$logId)
            jsonResponse(['error' => 'ID do logausente'], 400);

        $stmt = $pdo->prepare('DELETE FROM action_logs WHERE id = ?');
        $stmt->execute([$logId]);
        jsonResponse(['message' => 'Registro excluído']);
    }
}

jsonResponse(['error' => 'Invalid method'], 405);
