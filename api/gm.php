<?php
// api/gm.php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'gm') {
    jsonResponse(['error' => 'Unauthorized. GM access required.'], 403);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'session_data') {
        // Get active session
        $stmt = $pdo->prepare('SELECT * FROM sessions WHERE gm_id = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$_SESSION['user_id']]);
        $session = $stmt->fetch();

        if (!$session) {
            jsonResponse(['session' => null]);
        }

        // Get characters in this session
        $stmtChar = $pdo->prepare('SELECT id, name, class, subclass, level, hp_base, hp_current, stress_base, stress_current, evasion_base, evasion_current_override, hope_current, session_status FROM characters WHERE session_id = ?');
        $stmtChar->execute([$session['id']]);
        $characters = $stmtChar->fetchAll();

        // Get adversaries
        $stmtAdv = $pdo->prepare('SELECT * FROM adversaries WHERE session_id = ?');
        $stmtAdv->execute([$session['id']]);
        $adversaries = $stmtAdv->fetchAll();

        jsonResponse([
            'session' => $session,
            'characters' => $characters,
            'adversaries' => $adversaries
        ]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Create new session
    if ($action === 'create_session') {
        $name = $input['name'] ?? 'Nova Sessão';
        $stmt = $pdo->prepare('INSERT INTO sessions (gm_id, name, fear_tokens) VALUES (?, ?, 0)');
        $stmt->execute([$_SESSION['user_id'], $name]);
        jsonResponse(['message' => 'Session created', 'id' => $pdo->lastInsertId()]);
    }

    // Fear Economy
    if ($action === 'update_fear') {
        $sessionId = $input['session_id'];
        $amount = (int) $input['amount']; // +1 or -1

        $stmt = $pdo->prepare('UPDATE sessions SET fear_tokens = GREATEST(0, fear_tokens + ?) WHERE id = ? AND gm_id = ?');
        $stmt->execute([$amount, $sessionId, $_SESSION['user_id']]);

        // Log GM action
        $logMsg = $amount > 0 ? "Mestre ganhou 1 Ficha de Medo." : "Mestre gastou 1 Ficha de Medo.";
        $stmtLog = $pdo->prepare('INSERT INTO action_logs (session_id, actor_name, action_type, message) VALUES (?, ?, ?, ?)');
        $stmtLog->execute([$sessionId, 'Mestre', 'status_change', $logMsg]);

        jsonResponse(['message' => 'Fear updated']);
    }

    // Adversary management
    if ($action === 'add_adversary') {
        $sessionId = $input['session_id'];
        $name = $input['name'] ?? 'Inimigo';
        $type = $input['type'] ?? 'minion';
        $hp = (int) ($input['hp'] ?? 1);
        $stress = (int) ($input['stress'] ?? 0);
        $tier = (int) ($input['tier'] ?? 1);

        $stmt = $pdo->prepare('INSERT INTO adversaries (session_id, name, type, hp, stress, tier) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$sessionId, $name, $type, $hp, $stress, $tier]);
        jsonResponse(['message' => 'Adversary added']);
    }

    if ($action === 'update_adversary') {
        $advId = $input['id'];
        $field = $input['field']; // hp or stress
        $val = (int) $input['value'];

        if (in_array($field, ['hp', 'stress'])) {
            $stmt = $pdo->prepare("UPDATE adversaries SET {$field} = ? WHERE id = ?");
            $stmt->execute([$val, $advId]);
            jsonResponse(['message' => 'Adversary updated']);
        }
    }

    if ($action === 'delete_adversary') {
        $advId = $input['id'];
        $stmt = $pdo->prepare('DELETE FROM adversaries WHERE id = ?');
        $stmt->execute([$advId]);
        jsonResponse(['message' => 'Adversary removed']);
    }

    // Player Status Manipulation
    if ($action === 'override_player_stat') {
        $charId = $input['character_id'];
        $field = $input['field'];
        $value = $input['value']; // could be null to reset
        $sessionId = $input['session_id'];

        if (in_array($field, ['evasion_current_override', 'hp_current', 'stress_current'])) {
            $stmt = $pdo->prepare("UPDATE characters SET {$field} = ? WHERE id = ?");
            $stmt->execute([$value, $charId]);

            // Log this so player sees it
            $fieldNames = ['evasion_current_override' => 'Evasão', 'hp_current' => 'PV', 'stress_current' => 'Stress'];
            $logMsg = "Mestre alterou o status <b>{$fieldNames[$field]}</b> do jogador para {$value}.";
            $stmtLog = $pdo->prepare('INSERT INTO action_logs (session_id, actor_name, action_type, message) VALUES (?, ?, ?, ?)');
            $stmtLog->execute([$sessionId, 'Mestre', 'status_change', $logMsg]);

            jsonResponse(['message' => 'Player status overridden']);
        }
    }

    // Join Requests Approval
    if ($action === 'approve_character') {
        $charId = $input['character_id'];
        $sessionId = $input['session_id'];

        $stmt = $pdo->prepare("UPDATE characters SET session_status = 'approved' WHERE id = ? AND session_id = ?");
        $stmt->execute([$charId, $sessionId]);
        jsonResponse(['message' => 'Character approved']);
    }

    if ($action === 'reject_character') {
        $charId = $input['character_id'];
        $sessionId = $input['session_id'];

        $stmt = $pdo->prepare("UPDATE characters SET session_id = NULL, session_status = NULL WHERE id = ? AND session_id = ?");
        $stmt->execute([$charId, $sessionId]);
        jsonResponse(['message' => 'Character rejected']);
    }
}

jsonResponse(['error' => 'Invalid action'], 400);
