<?php
// api/character.php
require_once __DIR__ . '/session.php';
require_once 'db.php';

header('Content-Type: application/json');

// Keep session alive during polling
if (isset($_SESSION['user_id'])) {
    if (!isset($_SESSION['last_activity']) || time() - $_SESSION['last_activity'] > 300) {
        $_SESSION['last_activity'] = time();
    }
}

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Not authenticated'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'mine') {
        // Fetch all current user's characters with session name and shop_open status
        $stmt = $pdo->prepare('SELECT c.*, s.name as session_name, s.shop_open FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.user_id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $chars = $stmt->fetchAll();

        foreach ($chars as &$char) {
            // Decode JSON fields
            $char['attributes'] = json_decode($char['attributes'], true);
            $char['inventory'] = json_decode($char['inventory'], true);
            $char['experiences'] = json_decode($char['experiences'], true);
            $char['cards'] = json_decode($char['cards'], true);
            $char['roleplay_answers'] = json_decode($char['roleplay_answers'], true);
        }

        jsonResponse(['characters' => $chars]);
    } elseif ($action === 'campaigns') {
        // Fetch all active sessions that a player can request to join
        $stmt = $pdo->query('SELECT id, name FROM sessions ORDER BY created_at DESC');
        $sessions = $stmt->fetchAll();
        jsonResponse(['campaigns' => $sessions]);
    } elseif ($action === 'get_player_character') {
        $charId = $_GET['id'] ?? null;
        $stmt = $pdo->prepare('SELECT c.*, s.name as session_name, s.shop_open FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND (c.user_id = ? OR s.gm_id = ?)');
        $stmt->execute([$charId, $_SESSION['user_id'], $_SESSION['user_id']]);
        $char = $stmt->fetch();
        if ($char) {
            $char['attributes'] = json_decode($char['attributes'], true);
            $char['inventory'] = json_decode($char['inventory'], true);
            $char['experiences'] = json_decode($char['experiences'], true);
            $char['cards'] = json_decode($char['cards'], true);
            $char['roleplay_answers'] = json_decode($char['roleplay_answers'], true);

            // Fetch logs if session exists
            $char['logs'] = [];
            $lastLogId = $_GET['last_log_id'] ?? null;
            if ($char['session_id'] && $lastLogId !== null) {
                $stmtL = $pdo->prepare('SELECT * FROM action_logs WHERE session_id = ? AND id > ? ORDER BY id ASC LIMIT 50');
                $stmtL->execute([$char['session_id'], $lastLogId]);
                $char['logs'] = $stmtL->fetchAll(PDO::FETCH_ASSOC);
            }

            jsonResponse($char);
        } else {
            jsonResponse(['error' => 'Not found'], 404);
        }
    } else {
        jsonResponse(['error' => 'Action GET not found'], 404);
    }
} else if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if ($action === 'create') {
        // Validate attributes distribution (+2, +1, +1, 0, 0, -1) can be done here or trusted from frontend for now.
        $attrJson = json_encode($input['attributes'] ?? []);
        $invJson = json_encode($input['inventory'] ?? ['equipped' => [], 'bag' => [], 'gold' => 0]);
        $expJson = json_encode($input['experiences'] ?? []);
        $cardsJson = json_encode($input['cards'] ?? []);
        $roleplayJson = json_encode($input['roleplay'] ?? []);

        $evasionBase = (int) ($input['evasion_base'] ?? 8);
        $hpBase = (int) ($input['hp_base'] ?? 6);
        $armorBase = (int) ($input['armor_base'] ?? 0);
        $stressBase = 6;
        $armorSlots = (int) ($input['armor_slots'] ?? 0);

        $secretNote = $input['secret_note'] ?? '';

        try {
            $stmt = $pdo->prepare('
                INSERT INTO characters 
                (user_id, name, class, subclass, heritage, hp_base, hp_current, stress_base, stress_current, evasion_base, hope_current, armor_base, armor_slots, attributes, inventory, experiences, cards, roleplay_answers, secret_note) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $_SESSION['user_id'],
                $input['name'] ?? 'Sem Nome',
                $input['class'] ?? 'Guerreiro',
                $input['subclass'] ?? '',
                $input['heritage'] ?? 'Humano',
                $hpBase,
                $hpBase, // hp_current = hp_base
                $stressBase,
                0,   // current fatigue = 0
                $evasionBase,
                2, // hope start = 2
                $armorBase,
                $armorSlots,
                $attrJson,
                $invJson,
                $expJson,
                $cardsJson,
                $roleplayJson,
                $secretNote
            ]);
            $newCharId = $pdo->lastInsertId();
            $charName = $input['name'] ?? 'Sem Nome';
            $charClass = ($input['class'] ?? 'Guerreiro') . ' - ' . ($input['subclass'] ?? '');

            // Busca a sessão ativa do jogador para logar (se existir)
            $stmtSess = $pdo->prepare('SELECT active_session_id FROM users WHERE id = ?');
            $stmtSess->execute([$_SESSION['user_id']]);
            $activeSessId = $stmtSess->fetchColumn();

            logAudit(
                $pdo,
                $activeSessId,
                $newCharId,
                $charName,
                'Criação de Personagem',
                "O jogador criou o personagem <b>{$charName}</b> ({$charClass}), Nível 1, com {$hpBase} PV base e Evasão {$evasionBase}."
            );

            jsonResponse(['message' => 'Character created successfully', 'id' => $newCharId]);
        } catch (Exception $e) {
            jsonResponse(['error' => 'Failed to create character: ' . $e->getMessage()], 500);
        }
    } elseif ($action === 'update_resource') {
        // Update a specific resource (HP, Stress, Hope, Armor etc)
        $charId = $input['character_id'] ?? null;
        $field = $input['field'] ?? null;
        $value = $input['value'] ?? 0;

        // Security check
        $stmt = $pdo->prepare('SELECT c.id FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND (c.user_id = ? OR s.gm_id = ?)');
        $stmt->execute([$charId, $_SESSION['user_id'], $_SESSION['user_id']]);
        if (!$stmt->fetch())
            jsonResponse(['error' => 'Unauthorized'], 403);

        $allowedFields = ['hp_current', 'stress_current', 'hope_current', 'evasion_current_override', 'armor_slots', 'armor_base_override', 'xp'];
        if (in_array($field, $allowedFields)) {
            // Fetch current to increment/decrement safely, alongside base stats and session ID for audit log
            $stmt = $pdo->prepare("SELECT session_id, name, {$field}, evasion_base, armor_base FROM characters WHERE id = ?");
            $stmt->execute([$charId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            $currentVal = $row[$field];

            // If the field is an override and it's null, we MUST start the calculation from its base value!
            if ($currentVal === null) {
                if ($field === 'evasion_current_override') {
                    $currentVal = $row['evasion_base'];
                } else if ($field === 'armor_base_override') {
                    $currentVal = $row['armor_base'];
                } else {
                    $currentVal = 0;
                }
            } else {
                $currentVal = (int) $currentVal;
            }

            $newVal = $currentVal + (int) $value;
            // Prevent going below 0 for standard resources
            if ($newVal < 0 && $field !== 'evasion_current_override' && $field !== 'armor_base_override') {
                $newVal = 0;
            }

            // Apply Upper Bounds if specified by frontend
            $maxLimit = $input['max_limit'] ?? null;
            if ($maxLimit !== null && $newVal > (int) $maxLimit) {
                $newVal = (int) $maxLimit;
            }

            $updateStmt = $pdo->prepare("UPDATE characters SET {$field} = ? WHERE id = ?");
            $updateStmt->execute([$newVal, $charId]);
            // Log the action
            $actionNames = [
                'hp_current' => 'PV',
                'stress_current' => 'Estresse',
                'hope_current' => 'Esperança',
                'evasion_current_override' => 'Evasão (Override)',
                'armor_slots' => 'Slots de Armadura',
                'armor_base_override' => 'Armadura Base (Override)',
                'xp' => 'Experiência'
            ];
            $friendlyName = $actionNames[$field] ?? $field;
            $diffText = $newVal > $currentVal ? "aumentou" : "reduziu";
            if ($newVal != $currentVal) {
                $desc = "{$diffText} {$friendlyName} de {$currentVal} para {$newVal}.";
                $type = "Recurso: {$friendlyName}";
                logAudit($pdo, $row['session_id'], $charId, $row['name'], $type, $desc);
            }

            jsonResponse(['message' => 'Updated successfully', 'new_value' => $newVal]);
        }

        // Special handle for JSON Gold Update
        if ($field === 'gold') {
            $stmt = $pdo->prepare("SELECT session_id, name, inventory FROM characters WHERE id = ?");
            $stmt->execute([$charId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $inv = json_decode($row['inventory'], true);
            if (!isset($inv['gold']))
                $inv['gold'] = 0;

            $oldGold = $inv['gold'];
            $inv['gold'] += (int) $value;
            if ($inv['gold'] < 0)
                $inv['gold'] = 0;

            $uStmt = $pdo->prepare("UPDATE characters SET inventory = ? WHERE id = ?");
            $uStmt->execute([json_encode($inv), $charId]);

            // Log Gold
            if ($oldGold != $inv['gold']) {
                $diffText = $inv['gold'] > $oldGold ? "ganhou" : "gastou";
                $desc = "O personagem {$diffText} ouro (De {$oldGold} para {$inv['gold']}).";
                logAudit($pdo, $row['session_id'], $charId, $row['name'], "Ouro", $desc);
            }

            jsonResponse(['message' => 'Gold updated successfully', 'new_value' => $inv['gold']]);
        }

        // Special handle for JSON Bag addition/removal
        if ($field === 'add_bag' || $field === 'remove_bag') {
            $stmt = $pdo->prepare("SELECT inventory FROM characters WHERE id = ?");
            $stmt->execute([$charId]);
            $inv = json_decode($stmt->fetchColumn(), true);
            if (!isset($inv['bag'])) {
                $inv['bag'] = [];
            }

            if ($field === 'add_bag') {
                $inv['bag'][] = (string) $value;
            } else if ($field === 'remove_bag') {
                $idx = (int) $value;
                if (isset($inv['bag'][$idx])) {
                    array_splice($inv['bag'], $idx, 1);
                }
            }

            $uStmt = $pdo->prepare("UPDATE characters SET inventory = ? WHERE id = ?");
            $uStmt->execute([json_encode($inv), $charId]);
            jsonResponse(['message' => 'Inventory Bag updated successfully']);
        }

        jsonResponse(['error' => 'Invalid field'], 400);

    } elseif ($action === 'update_inventory') {
        $charId = $input['id'] ?? null;
        $inventory = $input['inventory'] ?? null;

        if (!$charId || !$inventory) {
            jsonResponse(['error' => 'ID do personagem ou inventário ausente.'], 400);
        }

        // Security check
        $stmt = $pdo->prepare('SELECT c.id FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND (c.user_id = ? OR s.gm_id = ?)');
        $stmt->execute([$charId, $_SESSION['user_id'], $_SESSION['user_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Unauthorized'], 403);
        }

        // Ensure bag and equipped are strict indexed arrays
        if (isset($inventory['bag']) && is_array($inventory['bag'])) {
            $inventory['bag'] = array_values($inventory['bag']);
        } else {
            $inventory['bag'] = [];
        }

        if (isset($inventory['equipped']) && is_array($inventory['equipped'])) {
            $inventory['equipped'] = array_values($inventory['equipped']);
        } else {
            $inventory['equipped'] = [];
        }

        // Save JSON string back to DB
        $invJson = json_encode($inventory);
        $updateStmt = $pdo->prepare('UPDATE characters SET inventory = ? WHERE id = ?');
        $updateStmt->execute([$invJson, $charId]);

        // Audit Log for full inventory updates
        $stmtName = $pdo->prepare("SELECT session_id, name FROM characters WHERE id = ?");
        $stmtName->execute([$charId]);
        $row = $stmtName->fetch(PDO::FETCH_ASSOC);
        logAudit($pdo, $row['session_id'], $charId, $row['name'], "Inventário", "O inventário do personagem foi reorganizado ou modificado.");

        jsonResponse(['message' => 'Inventário atualizado com sucesso.']);

    } elseif ($action === 'update_attributes') {
        $charId = $input['id'] ?? null;
        $attributes = $input['attributes'] ?? null;

        if (!$charId || !$attributes) {
            jsonResponse(['error' => 'ID do personagem ou atributos ausentes.'], 400);
        }

        // Security check
        $stmt = $pdo->prepare('SELECT c.id FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND (c.user_id = ? OR s.gm_id = ?)');
        $stmt->execute([$charId, $_SESSION['user_id'], $_SESSION['user_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Unauthorized'], 403);
        }

        $attrJson = json_encode($attributes);
        $updateStmt = $pdo->prepare('UPDATE characters SET attributes = ? WHERE id = ?');
        $updateStmt->execute([$attrJson, $charId]);

        // Audit log for attributes
        $stmtName = $pdo->prepare("SELECT session_id, name FROM characters WHERE id = ?");
        $stmtName->execute([$charId]);
        $row = $stmtName->fetch(PDO::FETCH_ASSOC);
        logAudit($pdo, $row['session_id'], $charId, $row['name'], "Atributos", "Os atributos primários do personagem foram subscritos ou atualizados.");

        jsonResponse(['message' => 'Atributos atualizados com sucesso.']);

    } elseif ($action === 'allow_level_up') {
        $charId = $input['character_id'] ?? null;

        if (!$charId) {
            jsonResponse(['error' => 'ID do personagem ausente.'], 400);
        }

        // Security check - Only the GM of the session can allow level up
        $stmt = $pdo->prepare('SELECT c.id FROM characters c JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND s.gm_id = ?');
        $stmt->execute([$charId, $_SESSION['user_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Unauthorized. Apenas o mestre da sessão pode permitir subir de nível.'], 403);
        }

        $updateStmt = $pdo->prepare('UPDATE characters SET can_level_up = 1 WHERE id = ?');
        $updateStmt->execute([$charId]);

        jsonResponse(['message' => 'Permissão para subir de nível concedida.']);

    } elseif ($action === 'set_avatar_y') {
        $charId = $input['character_id'] ?? null;
        $val = (int) ($input['value'] ?? 50);

        if (!$charId) {
            jsonResponse(['error' => 'ID do personagem ausente.'], 400);
        }

        // Security check
        $stmt = $pdo->prepare('SELECT c.id FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND (c.user_id = ? OR s.gm_id = ?)');
        $stmt->execute([$charId, $_SESSION['user_id'], $_SESSION['user_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Unauthorized'], 403);
        }

        $updateStmt = $pdo->prepare('UPDATE characters SET avatar_y = ? WHERE id = ?');
        $updateStmt->execute([$val, $charId]);

        jsonResponse(['message' => 'Posição do avatar atualizada.']);

    } elseif ($action === 'join_session') {
        $charId = $input['character_id'] ?? null;
        $sessionId = $input['session_id'] ?? null;

        $sStmt = $pdo->prepare('SELECT id FROM sessions WHERE id = ?');
        $sStmt->execute([$sessionId]);
        if (!$sStmt->fetch())
            jsonResponse(['error' => 'Sessão não encontrada'], 404);

        // Insert them as pending initially.
        $stmt = $pdo->prepare("UPDATE characters SET session_id = ?, session_status = 'pending' WHERE id = ? AND user_id = ?");
        $stmt->execute([$sessionId, $charId, $_SESSION['user_id']]);
        jsonResponse(['message' => 'Requested to join session']);
    } elseif ($action === 'upload_avatar') {
        $charId = $_POST['character_id'] ?? null;
        if (!$charId || !isset($_FILES['avatar_file'])) {
            jsonResponse(['error' => 'ID do personagem ou arquivo ausente.'], 400);
        }

        // Security check
        $stmt = $pdo->prepare('SELECT c.id FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND (c.user_id = ? OR s.gm_id = ?)');
        $stmt->execute([$charId, $_SESSION['user_id'], $_SESSION['user_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Unauthorized'], 403);
        }

        $file = $_FILES['avatar_file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(['error' => 'Erro no upload do arquivo.'], 400);
        }

        // Validate type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            jsonResponse(['error' => 'Tipo de arquivo não permitido. Use JPG, PNG ou WEBP.'], 400);
        }

        if ($file['size'] > 10 * 1024 * 1024) { // 10MB limit
            jsonResponse(['error' => 'Arquivo muito grande. O limite é 10 MB.'], 400);
        }

        $uploadDir = __DIR__ . '/../uploads/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $charId . '_' . time() . '.' . $ext;
        $destPath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            $avatarUrl = 'uploads/avatars/' . $filename;
            $updateStmt = $pdo->prepare('UPDATE characters SET avatar = ? WHERE id = ?');
            $updateStmt->execute([$avatarUrl, $charId]);
            jsonResponse(['message' => 'Avatar enviado com sucesso.', 'avatar_url' => $avatarUrl]);
        } else {
            jsonResponse(['error' => 'Falha ao salvar a imagem no servidor.'], 500);
        }
    } elseif ($action === 'delete') {
        $charId = $input['character_id'] ?? null;

        $stmt = $pdo->prepare('DELETE FROM characters WHERE id = ? AND user_id = ?');
        $stmt->execute([$charId, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) {
            jsonResponse(['message' => 'Personagem deletado com sucesso.']);
        } else {
            jsonResponse(['error' => 'Personagem não encontrado ou não autorizado.'], 404);
        }
    } else {
        jsonResponse(['error' => 'Action POST not found'], 404);
    }
}

jsonResponse(['error' => 'Invalid action'], 400);
