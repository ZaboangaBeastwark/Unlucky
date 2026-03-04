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
        $stmtChar = $pdo->prepare('SELECT c.*, u.username as player_name FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.session_id = ?');
        $stmtChar->execute([$session['id']]);
        $characters = $stmtChar->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON fields for each character so the frontend receives them properly
        foreach ($characters as &$char) {
            $char['attributes'] = json_decode($char['attributes'] ?? '{}', true);
            $char['inventory'] = json_decode($char['inventory'] ?? '{"equipped":[],"bag":[],"gold":0}', true);
            $char['experiences'] = json_decode($char['experiences'] ?? '[]', true);
            $char['cards'] = json_decode($char['cards'] ?? '[]', true);
            $char['roleplay_answers'] = json_decode($char['roleplay_answers'] ?? '[]', true);
        }

        // Get adversaries (vivos na cena)
        $stmtAdv = $pdo->prepare('SELECT * FROM adversaries WHERE session_id = ?');
        $stmtAdv->execute([$session['id']]);
        $adversaries = $stmtAdv->fetchAll();

        // Get Bestiary Templates (do Mestre atual ou Geração do Sistema - gm_id IS NULL)
        $stmtTpl = $pdo->prepare('SELECT * FROM adversary_templates WHERE gm_id = ? OR gm_id IS NULL ORDER BY name ASC');
        $stmtTpl->execute([$_SESSION['user_id']]);
        $bestiary = $stmtTpl->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON fields for bestiary
        foreach ($bestiary as &$beast) {
            $beast['attack'] = json_decode($beast['attack'] ?? '{}', true);
            $beast['experiences'] = json_decode($beast['experiences'] ?? '[]', true);
            $beast['abilities'] = json_decode($beast['abilities'] ?? '[]', true);
        }

        // Get Encounter Groups
        $stmtGroups = $pdo->prepare('SELECT * FROM encounter_groups WHERE session_id = ? ORDER BY id ASC');
        $stmtGroups->execute([$session['id']]);
        $encounter_groups = $stmtGroups->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse([
            'session' => $session,
            'characters' => $characters,
            'adversaries' => $adversaries,
            'bestiary' => $bestiary,
            'encounter_groups' => $encounter_groups
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
        $encounterId = isset($input['encounter_id']) ? (int) $input['encounter_id'] : null;
        $templateId = isset($input['template_id']) ? (int) $input['template_id'] : null;

        $stmt = $pdo->prepare('INSERT INTO adversaries (session_id, name, type, hp, stress, tier, encounter_id, template_id, current_hp, current_stress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
        // Current HP defaults to max HP initially
        $stmt->execute([$sessionId, $name, $type, $hp, $stress, $tier, $encounterId, $templateId, $hp]);
        jsonResponse(['message' => 'Adversary added', 'id' => $pdo->lastInsertId()]);
    }

    if ($action === 'update_adversary') {
        $advId = $input['id'];
        $field = $input['field']; // hp, stress, current_hp, current_stress, encounter_id
        $val = (int) $input['value'];

        if (in_array($field, ['hp', 'stress', 'current_hp', 'current_stress', 'encounter_id'])) {
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

    // Encounter Groups
    if ($action === 'create_encounter') {
        $sessionId = $input['session_id'];
        $name = $input['name'] ?? 'Novo Encontro';

        $stmt = $pdo->prepare('INSERT INTO encounter_groups (session_id, name) VALUES (?, ?)');
        $stmt->execute([$sessionId, $name]);
        jsonResponse(['message' => 'Encounter created', 'id' => $pdo->lastInsertId()]);
    }

    if ($action === 'delete_encounter') {
        $groupId = $input['id'];
        $stmt = $pdo->prepare('DELETE FROM encounter_groups WHERE id = ?');
        $stmt->execute([$groupId]);
        jsonResponse(['message' => 'Encounter removed']);
    }

    // Bestiary Templates (Custom Monsters for GM)
    if ($action === 'create_bestiary_template') {
        $stmt = $pdo->prepare('INSERT INTO adversary_templates (gm_id, name, tier, type, difficulty, hp_max, stress_max, threshold_major, threshold_severe, horde_multiplier, description, motivations, attack, experiences, abilities) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $_SESSION['user_id'],
            $input['name'] ?? 'Novo Oponente',
            (int) ($input['tier'] ?? 1),
            $input['type'] ?? 'Comum',
            (int) ($input['difficulty'] ?? 10),
            (int) ($input['hp_max'] ?? 1),
            (int) ($input['stress_max'] ?? 0),
            isset($input['threshold_major']) ? (int) $input['threshold_major'] : null,
            isset($input['threshold_severe']) ? (int) $input['threshold_severe'] : null,
            isset($input['horde_multiplier']) ? (int) $input['horde_multiplier'] : null,
            $input['description'] ?? '',
            $input['motivations'] ?? '',
            json_encode($input['attack'] ?? []),
            json_encode($input['experiences'] ?? []),
            json_encode($input['abilities'] ?? [])
        ]);
        jsonResponse(['message' => 'Template created', 'id' => $pdo->lastInsertId()]);
    }

    if ($action === 'update_bestiary_template') {
        // A GM can only update their own templates (gm_id = their id, not NULL canonical)
        $id = $input['id'];
        $stmt = $pdo->prepare('UPDATE adversary_templates SET name=?, tier=?, type=?, difficulty=?, hp_max=?, stress_max=?, threshold_major=?, threshold_severe=?, horde_multiplier=?, description=?, motivations=?, attack=?, experiences=?, abilities=? WHERE id = ? AND gm_id = ?');
        $stmt->execute([
            $input['name'],
            (int) $input['tier'],
            $input['type'],
            (int) $input['difficulty'],
            (int) $input['hp_max'],
            (int) $input['stress_max'],
            isset($input['threshold_major']) ? (int) $input['threshold_major'] : null,
            isset($input['threshold_severe']) ? (int) $input['threshold_severe'] : null,
            isset($input['horde_multiplier']) ? (int) $input['horde_multiplier'] : null,
            $input['description'] ?? '',
            $input['motivations'] ?? '',
            json_encode($input['attack'] ?? []),
            json_encode($input['experiences'] ?? []),
            json_encode($input['abilities'] ?? []),
            $id,
            $_SESSION['user_id']
        ]);
        if ($stmt->rowCount() > 0) {
            jsonResponse(['message' => 'Template updated']);
        } else {
            jsonResponse(['error' => 'Not found or permission denied (Cannot edit base templates)'], 403);
        }
    }

    if ($action === 'delete_bestiary_template') {
        $id = $input['id'];
        $stmt = $pdo->prepare('DELETE FROM adversary_templates WHERE id = ? AND gm_id = ?');
        $stmt->execute([$id, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) {
            jsonResponse(['message' => 'Template removed']);
        } else {
            jsonResponse(['error' => 'Not found or permission denied (Cannot delete base templates)'], 403);
        }
    }

    // Toggle Shop
    if ($action === 'toggle_shop') {
        $sessionId = $input['session_id'];
        $isOpen = (isset($input['is_open']) && $input['is_open']) ? 1 : 0;

        $stmt = $pdo->prepare('UPDATE sessions SET shop_open = ? WHERE id = ? AND gm_id = ?');
        $stmt->execute([$isOpen, $sessionId, $_SESSION['user_id']]);

        $statusText = $isOpen ? 'abriu' : 'fechou';
        $logMsg = "O Mestre <b>{$statusText}</b> o Mercado para os jogadores.";
        $stmtLog = $pdo->prepare('INSERT INTO action_logs (session_id, actor_name, action_type, message) VALUES (?, ?, ?, ?)');
        $stmtLog->execute([$sessionId, 'Sistema', 'status_change', $logMsg]);

        jsonResponse(['message' => "Shop $statusText"]);
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

    // Change Character Status (Active, Suspended, Deceased)
    if ($action === 'update_character_status') {
        $charId = $input['character_id'];
        $sessionId = $input['session_id'];
        $status = $input['status'];

        if (!in_array($status, ['approved', 'suspended', 'deceased'])) {
            jsonResponse(['error' => 'Invalid status'], 400);
        }

        $stmt = $pdo->prepare("UPDATE characters SET session_status = ? WHERE id = ? AND session_id = ?");
        $stmt->execute([$status, $charId, $sessionId]);

        $statusPt = ['approved' => 'Ativo', 'suspended' => 'Suspenso', 'deceased' => 'Falecido'][$status];

        $stmtChar = $pdo->prepare("SELECT name FROM characters WHERE id = ?");
        $stmtChar->execute([$charId]);
        $charName = $stmtChar->fetchColumn();

        $logMsg = "O Mestre alterou o status de <b>{$charName}</b> para: {$statusPt}.";
        $stmtLog = $pdo->prepare('INSERT INTO action_logs (session_id, actor_name, action_type, message) VALUES (?, ?, ?, ?)');
        $stmtLog->execute([$sessionId, 'Mestre', 'status_change', $logMsg]);

        jsonResponse(['message' => 'Character status updated']);
    }
}

jsonResponse(['error' => 'Invalid action'], 400);
