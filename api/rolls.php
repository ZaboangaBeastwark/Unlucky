<?php
// api/rolls.php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Not authenticated'], 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $sessionId = $input['session_id'] ?? null;
    $actorName = $input['actor_name'] ?? $_SESSION['username'];
    $modifier = (int) ($input['modifier'] ?? 0);
    $actionName = $input['action_name'] ?? 'Teste de Atributo';

    if (!$sessionId) {
        jsonResponse(['error' => 'Session ID required'], 400);
    }

    // Daggerheart 2d12 mechanics
    $hopeDie = rand(1, 12);
    $fearDie = rand(1, 12);

    $total = $hopeDie + $fearDie + $modifier;
    $isCritical = ($hopeDie === $fearDie);

    $resultType = '';
    if ($isCritical) {
        $resultType = 'Sucesso Crítico!';
    } else if ($hopeDie > $fearDie) {
        $resultType = 'com Esperança';
    } else {
        $resultType = 'com Medo';
    }

    $modifierStr = $modifier >= 0 ? "+{$modifier}" : (string) $modifier;
    $message = "<b>{$actorName}</b> rolou {$actionName}: <b>{$total}</b> [Esperança: {$hopeDie}, Medo: {$fearDie}, Mod: {$modifierStr}] - <i>{$resultType}</i>";

    // Save to action_logs
    $stmt = $pdo->prepare('INSERT INTO action_logs (session_id, actor_id, actor_name, action_type, hope_die, fear_die, critical, total, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $sessionId,
        $_SESSION['user_id'],
        $actorName,
        'roll',
        $hopeDie,
        $fearDie,
        $isCritical ? 1 : 0,
        $total,
        $message
    ]);

    jsonResponse([
        'hope' => $hopeDie,
        'fear' => $fearDie,
        'modifier' => $modifier,
        'total' => $total,
        'is_critical' => $isCritical,
        'result_type' => $resultType,
        'message' => $message,
        'log_id' => $pdo->lastInsertId()
    ]);
}

jsonResponse(['error' => 'Invalid method'], 405);
