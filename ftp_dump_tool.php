<?php
require_once __DIR__ . '/api/db.php';
header('Content-Type: application/json');
try {
    $stmt = $pdo->query("SELECT id, name, gm_id, created_at FROM sessions");
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmtGM = $pdo->query("SELECT id, username FROM users WHERE role = 'gm'");
    $gms = $stmtGM->fetchAll(PDO::FETCH_ASSOC);

    $stmtLogs = $pdo->query("SELECT session_id, actor_name, COUNT(*) as c FROM action_logs WHERE actor_name != 'Sistema' GROUP BY session_id, actor_name");
    $logs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

    $data = ['sessions' => $sessions, 'gms' => $gms, 'logs' => $logs];
    echo json_encode($data, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
