<?php
// api/character.php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Not authenticated'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

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
        $stmt = $pdo->prepare('SELECT c.*, s.name as session_name, s.shop_open FROM characters c LEFT JOIN sessions s ON c.session_id = s.id WHERE c.id = ? AND c.user_id = ?');
        $stmt->execute([$charId, $_SESSION['user_id']]);
        $char = $stmt->fetch();
        if ($char) {
            $char['attributes'] = json_decode($char['attributes'], true);
            $char['inventory'] = json_decode($char['inventory'], true);
            $char['experiences'] = json_decode($char['experiences'], true);
            $char['cards'] = json_decode($char['cards'], true);
            $char['roleplay_answers'] = json_decode($char['roleplay_answers'], true);
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
            jsonResponse(['message' => 'Character created successfully', 'id' => $pdo->lastInsertId()]);
        } catch (Exception $e) {
            jsonResponse(['error' => 'Failed to create character: ' . $e->getMessage()], 500);
        }
    } elseif ($action === 'update_resource') {
        // Update a specific resource (HP, Stress, Hope, Armor etc)
        $charId = $input['character_id'] ?? null;
        $field = $input['field'] ?? null;
        $value = $input['value'] ?? 0;

        // Security check
        $stmt = $pdo->prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?');
        $stmt->execute([$charId, $_SESSION['user_id']]);
        if (!$stmt->fetch())
            jsonResponse(['error' => 'Unauthorized'], 403);

        $allowedFields = ['hp_current', 'stress_current', 'hope_current', 'evasion_current_override', 'armor_slots', 'armor_base_override'];
        if (in_array($field, $allowedFields)) {
            // Fetch current to increment/decrement safely, alongside base stats to calculate overrides from the correct baseline
            $stmt = $pdo->prepare("SELECT {$field}, evasion_base, armor_base FROM characters WHERE id = ?");
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
            jsonResponse(['message' => 'Updated successfully', 'new_value' => $newVal]);
        }

        // Special handle for JSON Gold Update
        if ($field === 'gold') {
            $stmt = $pdo->prepare("SELECT inventory FROM characters WHERE id = ?");
            $stmt->execute([$charId]);
            $invStr = $stmt->fetchColumn();
            $inv = json_decode($invStr, true);
            if (!isset($inv['gold']))
                $inv['gold'] = 0;

            $inv['gold'] += (int) $value;
            if ($inv['gold'] < 0)
                $inv['gold'] = 0;

            $uStmt = $pdo->prepare("UPDATE characters SET inventory = ? WHERE id = ?");
            $uStmt->execute([json_encode($inv), $charId]);
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
        $stmt = $pdo->prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?');
        $stmt->execute([$charId, $_SESSION['user_id']]);
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

        jsonResponse(['message' => 'Inventário atualizado com sucesso.']);

    } elseif ($action === 'join_session') {
        $charId = $input['character_id'] ?? null;
        $sessionId = $input['session_id'] ?? null;

        $sStmt = $pdo->prepare('SELECT id FROM sessions WHERE id = ?');
        $sStmt->execute([$sessionId]);
        if (!$sStmt->fetch())
            jsonResponse(['error' => 'Sessão não encontrada'], 404);

        $stmt = $pdo->prepare('UPDATE characters SET session_id = ? WHERE id = ? AND user_id = ?');
        $stmt->execute([$sessionId, $charId, $_SESSION['user_id']]);
        jsonResponse(['message' => 'Requested to join session']);
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
