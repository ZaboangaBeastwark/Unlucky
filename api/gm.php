<?php
// api/gm.php
require_once __DIR__ . '/session.php';
require_once 'db.php';

header('Content-Type: application/json');

// Keep session alive during GM polling
if (isset($_SESSION['user_id'])) {
    $_SESSION['last_activity'] = time();
}

requireGM();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'session_data_live') {
        // Find which session is currently active for this GM
        $stmtActive = $pdo->prepare('SELECT active_session_id FROM users WHERE id = ?');
        $stmtActive->execute([$_SESSION['user_id']]);
        $active_session_id = $stmtActive->fetchColumn();

        // Get all sessions for this GM (to populate the dropdown)
        $stmtAll = $pdo->prepare('SELECT id, name FROM sessions WHERE gm_id = ? ORDER BY id DESC');
        $stmtAll->execute([$_SESSION['user_id']]);
        $all_sessions = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

        if (count($all_sessions) === 0) {
            jsonResponse(['session' => null, 'all_sessions' => []]);
        }

        // If no active session is set, default to the most recent one
        if (!$active_session_id) {
            $active_session_id = $all_sessions[0]['id'];
            $pdo->prepare('UPDATE users SET active_session_id = ? WHERE id = ?')->execute([$active_session_id, $_SESSION['user_id']]);
        } else {
            // Verify if active session still exists
            $exists = false;
            foreach ($all_sessions as $s) {
                if ($s['id'] == $active_session_id) {
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                $active_session_id = $all_sessions[0]['id'];
                $pdo->prepare('UPDATE users SET active_session_id = ? WHERE id = ?')->execute([$active_session_id, $_SESSION['user_id']]);
            }
        }

        // Load the active session data
        $stmt = $pdo->prepare('SELECT * FROM sessions WHERE id = ? AND gm_id = ?');
        $stmt->execute([$active_session_id, $_SESSION['user_id']]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            // Failsafe
            jsonResponse(['session' => null, 'all_sessions' => $all_sessions]);
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
            'all_sessions' => $all_sessions,
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
        $new_id = $pdo->lastInsertId();

        // Auto-set as active
        $pdo->prepare('UPDATE users SET active_session_id = ? WHERE id = ?')->execute([$new_id, $_SESSION['user_id']]);

        jsonResponse(['message' => 'Session created', 'id' => $new_id]);
    }

    // Set Active Session explicitly
    if ($action === 'set_active_session') {
        $session_id = $input['session_id'];
        $pdo->prepare('UPDATE users SET active_session_id = ? WHERE id = ?')->execute([$session_id, $_SESSION['user_id']]);
        jsonResponse(['message' => 'Active session changed']);
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
        $avatar = $input['avatar'] ?? null;
        $token = $input['token'] ?? null;

        $stmt = $pdo->prepare('INSERT INTO adversaries (session_id, name, type, hp, stress, tier, encounter_id, template_id, avatar, token, current_hp, current_stress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
        // Current HP defaults to max HP initially
        $stmt->execute([$sessionId, $name, $type, $hp, $stress, $tier, $encounterId, $templateId, $avatar, $token, $hp]);
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
        $stmt = $pdo->prepare('INSERT INTO adversary_templates (gm_id, name, tier, type, difficulty, hp_max, stress_max, threshold_major, threshold_severe, horde_multiplier, description, motivations, attack, experiences, abilities, avatar, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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
            json_encode($input['abilities'] ?? []),
            $input['avatar'] ?? null,
            $input['token'] ?? null
        ]);
        jsonResponse(['message' => 'Template created', 'id' => $pdo->lastInsertId()]);
    }

    if ($action === 'update_bestiary_template') {
        // A GM can now update any template, even the base book ones
        $id = $input['id'];
        $stmt = $pdo->prepare('UPDATE adversary_templates SET name=?, tier=?, type=?, difficulty=?, hp_max=?, stress_max=?, threshold_major=?, threshold_severe=?, horde_multiplier=?, description=?, motivations=?, attack=?, experiences=?, abilities=?, avatar=?, token=? WHERE id = ?');
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
            $input['avatar'] ?? null,
            $input['token'] ?? null,
            $id
        ]);
        if ($stmt->rowCount() >= 0) {
            // Se as imagens foram atualizadas, propague para todos os monstros ativos dessa ficha!
            if (isset($input['avatar']) || isset($input['token'])) {
                $stmtActive = $pdo->prepare('UPDATE adversaries SET avatar=?, token=? WHERE template_id=? AND session_id IN (SELECT id FROM sessions WHERE gm_id=?)');
                $stmtActive->execute([
                    $input['avatar'] ?? null,
                    $input['token'] ?? null,
                    $id,
                    $_SESSION['user_id']
                ]);
            }
            jsonResponse(['message' => 'Template updated']);
        } else {
            jsonResponse(['error' => 'Database error updating template or no changes made'], 500);
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

    // Upload Image for Bestiary Template
    if ($action === 'upload_adversary_image') {
        if (!isset($_FILES['image']))
            jsonResponse(['error' => 'No file uploaded'], 400);

        // Accept 'avatar' or 'token' as image_type
        $imageType = $_POST['image_type'] ?? 'avatar';
        if (!in_array($imageType, ['avatar', 'token']))
            $imageType = 'avatar';

        $file = $_FILES['image'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'gif']))
            jsonResponse(['error' => 'Invalid file format'], 400);

        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0777, true);

        // Gerar ID seguro
        $safeId = uniqid('adv_');
        $filename = "{$imageType}_{$safeId}." . $ext;
        $targetPath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $url = 'uploads/' . $filename;
            jsonResponse(['message' => ucfirst($imageType) . ' uploaded correctly', 'url' => $url]);
        } else {
            jsonResponse(['error' => 'Failed to save file'], 500);
        }
    }
}

jsonResponse(['error' => 'Invalid action'], 400);

