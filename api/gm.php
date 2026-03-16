<?php
// api/gm.php - RESTORED STABLE VERSION
require_once __DIR__ . '/session.php';
require_once 'db.php';

error_reporting(0);
ini_set('display_errors', 0);

requireGM();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'init') {
        // 1. All Sessions for the GM
        $stmtAll = $pdo->prepare('SELECT id, name FROM sessions WHERE gm_id = ? ORDER BY id DESC');
        $stmtAll->execute([$_SESSION['user_id']]);
        $all_sessions = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

        // 2. Bestiary Templates
        $stmtTpl = $pdo->prepare('SELECT id, gm_id, name, type, hp, stress, tier, difficulty, horde_multiplier, damage_major, damage_severe, motives, description, attack, abilities, experiences FROM adversary_templates WHERE gm_id = ? OR gm_id IS NULL');
        $stmtTpl->execute([$_SESSION['user_id']]);
        $bestiary = $stmtTpl->fetchAll(PDO::FETCH_ASSOC);
        foreach ($bestiary as &$beast) {
            $beast['attack'] = json_decode($beast['attack'] ?? '{}', true);
            $beast['experiences'] = json_decode($beast['experiences'] ?? '[]', true);
            $beast['abilities'] = json_decode($beast['abilities'] ?? '[]', true);
        }

        while (ob_get_level())
            ob_end_clean();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'all_sessions' => $all_sessions,
            'bestiary' => $bestiary
        ]);
        exit;

    } elseif ($action === 'session_data_live') {
        $active_session_id = $_GET['session_id'] ?? null;
        if (!$active_session_id) {
            jsonResponse(['error' => 'Missing session_id'], 400);
        }

        // Verify GM owns the session
        $stmt = $pdo->prepare('SELECT * FROM sessions WHERE id = ? AND gm_id = ?');
        $stmt->execute([$active_session_id, $_SESSION['user_id']]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            jsonResponse(['error' => 'Session not found or unauthorized', 'session' => null]);
        }

        // 3. Characters
        $stmtChar = $pdo->prepare('SELECT c.*, u.username as player_name FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.session_id = ?');
        $stmtChar->execute([$active_session_id]);
        $characters = $stmtChar->fetchAll(PDO::FETCH_ASSOC);
        foreach ($characters as &$char) {
            $char['attributes'] = json_decode($char['attributes'] ?? '{}', true);
            $char['inventory'] = json_decode($char['inventory'] ?? '{"equipped":[],"bag":[],"gold":0}', true);
            $char['experiences'] = json_decode($char['experiences'] ?? '[]', true);
            $char['cards'] = json_decode($char['cards'] ?? '[]', true);
            $char['roleplay_answers'] = json_decode($char['roleplay_answers'] ?? '[]', true);
        }

        // 4. Adversaries
        $stmtAdv = $pdo->prepare('SELECT id, session_id, name, type, hp, current_hp, stress, current_stress, tier, encounter_id, template_id FROM adversaries WHERE session_id = ?');
        $stmtAdv->execute([$active_session_id]);
        $adversaries = $stmtAdv->fetchAll();

        // 5. Encounter Groups
        $stmtGroups = $pdo->prepare('SELECT * FROM encounter_groups WHERE session_id = ?');
        $stmtGroups->execute([$active_session_id]);
        $encounter_groups = $stmtGroups->fetchAll(PDO::FETCH_ASSOC);

        // 6. Optional: Combined Logs
        $logs = [];
        $last_log_id = $_GET['last_log_id'] ?? null;
        if ($last_log_id !== null) {
            $stmtL = $pdo->prepare('SELECT * FROM action_logs WHERE session_id = ? AND id > ? ORDER BY id ASC LIMIT 50');
            $stmtL->execute([$active_session_id, $last_log_id]);
            $logs = $stmtL->fetchAll(PDO::FETCH_ASSOC);
        }

        // CLEAN BUFFER AND OUTPUT
        jsonResponse([
            'session' => $session,
            'characters' => $characters,
            'adversaries' => $adversaries,
            'encounter_groups' => $encounter_groups,
            'logs' => $logs
        ]);
        exit;
    }

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if ($action === 'create_session') {
        $name = $input['name'] ?? 'Nova Sessão';
        $stmt = $pdo->prepare('INSERT INTO sessions (gm_id, name, fear_tokens) VALUES (?, ?, 0)');
        $stmt->execute([$_SESSION['user_id'], $name]);
        jsonResponse(['message' => 'Session created', 'id' => $pdo->lastInsertId()]);
    }

    if ($action === 'delete_session') {
        $sessionId = $input['session_id'] ?? null;
        if ($sessionId) {
            $stmt = $pdo->prepare('DELETE FROM sessions WHERE id = ? AND gm_id = ?');
            $stmt->execute([$sessionId, $_SESSION['user_id']]);
            jsonResponse(['message' => 'Session deleted']);
        }
        jsonResponse(['error' => 'Missing session_id'], 400);
    }

    if ($action === 'add_adversary') {
        $stmt = $pdo->prepare('INSERT INTO adversaries (session_id, name, type, hp, current_hp, stress, current_stress, tier, encounter_id, template_id, avatar, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $input['session_id'],
            $input['name'],
            $input['type'],
            $input['hp'],
            $input['hp'], // current_hp starts as hp
            $input['stress'] ?? 0,
            $input['stress'] ?? 0, // current_stress starts as stress
            $input['tier'] ?? 1,
            $input['encounter_id'] ?? null,
            $input['template_id'] ?? null,
            $input['avatar'] ?? null,
            $input['token'] ?? null
        ]);
        jsonResponse(['status' => 'ok']);

    } elseif ($action === 'update_adversary') {
        $id = $input['id'];
        $field = $input['field'];
        $value = $input['value'];
        $allowed = ['hp', 'current_hp', 'stress', 'current_stress', 'encounter_id'];
        if (in_array($field, $allowed)) {
            $stmt = $pdo->prepare("UPDATE adversaries SET $field = ? WHERE id = ?");
            $stmt->execute([$value, $id]);
        }
        jsonResponse(['status' => 'ok']);

    } elseif ($action === 'delete_adversary') {
        $stmt = $pdo->prepare('DELETE FROM adversaries WHERE id = ?');
        $stmt->execute([$input['id']]);
        jsonResponse(['status' => 'ok']);

    } elseif ($action === 'create_encounter') {
        $stmt = $pdo->prepare('INSERT INTO encounter_groups (session_id, name) VALUES (?, ?)');
        $stmt->execute([$input['session_id'], $input['name']]);
        jsonResponse(['status' => 'ok']);

    } elseif ($action === 'delete_encounter') {
        $stmt = $pdo->prepare('DELETE FROM encounter_groups WHERE id = ?');
        $stmt->execute([$input['id']]);
        $pdo->prepare('UPDATE adversaries SET encounter_id = NULL WHERE encounter_id = ?')->execute([$input['id']]);
        jsonResponse(['status' => 'ok']);

    } elseif ($action === 'update_fear') {
        $stmt = $pdo->prepare('UPDATE sessions SET fear_tokens = fear_tokens + ? WHERE id = ?');
        $stmt->execute([$input['amount'], $input['session_id']]);
        jsonResponse(['status' => 'ok']);

    } elseif ($action === 'toggle_shop') {
        $stmt = $pdo->prepare('UPDATE sessions SET shop_open = ? WHERE id = ?');
        $stmt->execute([$input['is_open'], $input['session_id']]);
        jsonResponse(['status' => 'ok']);

    } elseif ($action === 'override_player_stat') {
        $fieldMap = [
            'evasion_current_override' => 'evasion_current_override',
            'hp_current' => 'hp_current',
            'stress_current' => 'stress_current'
        ];
        $field = $fieldMap[$input['field']] ?? null;
        if ($field) {
            $stmt = $pdo->prepare("UPDATE characters SET $field = ? WHERE id = ? AND session_id = ?");
            $stmt->execute([$input['value'], $input['character_id'], $input['session_id']]);
        }
        jsonResponse(['status' => 'ok']);
    } elseif ($action === 'unset_active_session') {
        // Just return ok, session_write_close in session.php means we'd need to re-open to clear session vars
        // but for now the frontend just needs a successful response to continue.
        jsonResponse(['status' => 'ok']);
    }
}
