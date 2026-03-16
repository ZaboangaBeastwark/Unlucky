<?php
// api/vtt.php
require_once __DIR__ . '/session.php';
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Not authenticated'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$requestData = ($method === 'POST') ? json_decode(file_get_contents('php://input'), true) : [];
if (!is_array($requestData))
    $requestData = [];

$action = $_REQUEST['action'] ?? ($requestData['action'] ?? '');
$action = trim($action);

// Helper to get active session ID for current user
function getActiveSessionId($pdo)
{
    if (isset($_SESSION['active_session_id']))
        return $_SESSION['active_session_id'];
    $stmt = $pdo->prepare('SELECT active_session_id FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetchColumn();
}

$active_session_id = getActiveSessionId($pdo);
if (!$active_session_id) {
    jsonResponse(['error' => 'Nenhuma campanha ativa encontrada. Vá para o dashboard e selecione uma campanha.'], 400);
}

if ($method === 'GET') {
    if ($action === 'get_scene') {
        $sceneId = $_GET['id'] ?? null;
        $scene = null;

        if ($sceneId) {
            // Fetch specific scene (if caller has access via session_id)
            $stmt = $pdo->prepare('SELECT * FROM vtt_scenes WHERE id = ? AND session_id = ? LIMIT 1');
            $stmt->execute([$sceneId, $active_session_id]);
            $scene = $stmt->fetch();
        } else {
            // Fetch the active scene for the session
            $stmt = $pdo->prepare('SELECT * FROM vtt_scenes WHERE session_id = ? AND is_active = 1 LIMIT 1');
            $stmt->execute([$active_session_id]);
            $scene = $stmt->fetch();
        }

        // If no active scene and no specific ID, and GM is calling, we still return null scene but all_scenes info
        $all_scenes = [];
        if ($_SESSION['role'] === 'gm') {
            $stmt = $pdo->prepare('SELECT * FROM vtt_scenes WHERE session_id = ? ORDER BY id DESC');
            $stmt->execute([$active_session_id]);
            $all_scenes = $stmt->fetchAll();
        }

        if (!$scene) {
            jsonResponse(['scene' => null, 'all_scenes' => $all_scenes, 'message' => 'No scene found or specified']);
        }

        // Fetch tokens for this scene
        // We join with characters and adversaries to get names/avatars
        $stmtTokens = $pdo->prepare('
            SELECT t.*, 
                   c.name as char_name, c.avatar as char_avatar, c.hp_current as char_hp, c.hp_base as char_hp_max,
                   a.name as adv_name, a.avatar as adv_avatar, a.current_hp as adv_hp, a.hp as adv_hp_max
            FROM vtt_tokens t
            LEFT JOIN characters c ON t.character_id = c.id
            LEFT JOIN adversaries a ON t.adversary_id = a.id
            WHERE t.scene_id = ?
        ');
        $stmtTokens->execute([$scene['id']]);
        $all_tokens = $stmtTokens->fetchAll();
        $tokens = [];

        foreach ($all_tokens as $t) {
            // Se for mestre, vê tudo. Se for jogador, só vê se não estiver escondido.
            if ($_SESSION['role'] === 'gm' || !$t['is_hidden']) {
                $tokens[] = $t;
            }
        }

        jsonResponse(['scene' => $scene, 'tokens' => $tokens, 'all_scenes' => $all_scenes]);
    }

    if ($action === 'get_all_scenes') {
        requireGM();
        $stmt = $pdo->prepare('SELECT * FROM vtt_scenes WHERE session_id = ? ORDER BY id DESC');
        $stmt->execute([$active_session_id]);
        jsonResponse(['scenes' => $stmt->fetchAll()]);
    }
} elseif ($method === 'POST') {
    $input = $requestData;

    if ($action === 'create_scene') {
        requireGM();
        $name = $input['name'] ?? 'Nova Cena';
        $bg = $input['background_url'] ?? '';
        $is_active = !empty($input['is_active']);

        // Check if there are ANY scenes for this session
        $stmtCheck = $pdo->prepare('SELECT COUNT(*) FROM vtt_scenes WHERE session_id = ?');
        $stmtCheck->execute([$active_session_id]);
        $hasScenes = $stmtCheck->fetchColumn() > 0;

        // If no scenes exist, the first one MUST be active
        if (!$hasScenes) {
            $is_active = true;
        }

        // Deactivate other scenes first if this is meant to be active
        if ($is_active) {
            $pdo->prepare('UPDATE vtt_scenes SET is_active = 0 WHERE session_id = ?')->execute([$active_session_id]);
        }

        $stmt = $pdo->prepare('INSERT INTO vtt_scenes (session_id, name, background_url, is_active) VALUES (?, ?, ?, ?)');
        $stmt->execute([$active_session_id, $name, $bg, $is_active ? 1 : 0]);

        jsonResponse(['message' => 'Scene created', 'id' => $pdo->lastInsertId()]);
    }

    if ($action === 'upload_background') {
        requireGM();
        if (!isset($_FILES['file'])) {
            jsonResponse(['error' => 'Nenhum arquivo enviado ou arquivo muito grande'], 400);
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(['error' => 'Erro no upload do PHP: ' . $file['error']], 500);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm'];

        if (!in_array($ext, $allowed)) {
            jsonResponse(['error' => 'Extensão não permitida: ' . $ext], 400);
        }

        $uploadDir = __DIR__ . '/../uploads/vtt/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                jsonResponse(['error' => 'Não foi possível criar o diretório de uploads. Verifique as permissões da pasta /uploads/'], 500);
            }
        }

        $filename = 'vtt_' . $active_session_id . '_' . time() . '.' . $ext;
        $targetPath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            jsonResponse(['url' => 'uploads/vtt/' . $filename]);
        } else {
            jsonResponse(['error' => 'Falha ao mover arquivo para destino final. Caminho: ' . $targetPath], 500);
        }
    }

    if ($action === 'update_token_pos') {
        $tokenId = $input['id'];
        $posX = (int) $input['pos_x'];
        $posY = (int) $input['pos_y'];

        // Security: Players can only move tokens tied to their character
        if ($_SESSION['role'] !== 'gm') {
            $stmtCheck = $pdo->prepare('SELECT character_id FROM vtt_tokens WHERE id = ?');
            $stmtCheck->execute([$tokenId]);
            $charId = $stmtCheck->fetchColumn();

            $stmtOwned = $pdo->prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?');
            $stmtOwned->execute([$charId, $_SESSION['user_id']]);
            if (!$stmtOwned->fetch()) {
                jsonResponse(['error' => 'Permission denied'], 403);
            }
        }

        $stmt = $pdo->prepare('UPDATE vtt_tokens SET pos_x = ?, pos_y = ? WHERE id = ?');
        $stmt->execute([$posX, $posY, $tokenId]);

        jsonResponse(['message' => 'Position updated']);
    }

    if ($action === 'add_token') {
        requireGM();
        $sceneId = $input['scene_id'];
        $charId = $input['character_id'] ?? null;
        $advId = $input['adversary_id'] ?? null;
        $posX = $input['pos_x'] ?? 100;
        $posY = $input['pos_y'] ?? 100;
        $name = $input['name'] ?? 'Token';
        $image_url = $input['image_url'] ?? '';
        $is_hidden = isset($input['is_hidden']) ? (int) $input['is_hidden'] : 0;
        $scale = isset($input['scale']) ? (float) $input['scale'] : 1.0;

        $stmt = $pdo->prepare('INSERT INTO vtt_tokens (scene_id, character_id, adversary_id, name, image_url, pos_x, pos_y, is_hidden, scale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$sceneId, $charId, $advId, $name, $image_url, $posX, $posY, $is_hidden, $scale]);

        jsonResponse(['message' => 'Token added', 'id' => $pdo->lastInsertId()]);
    }

    if ($action === 'update_token_meta') {
        $tokenId = $input['id'];
        $field = $input['field']; // 'is_hidden' or 'scale'
        $value = $input['value'];

        if (!in_array($field, ['is_hidden', 'scale'])) {
            jsonResponse(['error' => 'Invalid field'], 400);
        }

        if ($_SESSION['role'] !== 'gm') {
            jsonResponse(['error' => 'Unauthorized'], 403);
        }

        $stmt = $pdo->prepare("UPDATE vtt_tokens SET $field = ? WHERE id = ?");
        $stmt->execute([($field === 'is_hidden' ? (int) $value : (float) $value), $tokenId]);
        jsonResponse(['message' => 'Token updated']);
    }

    if ($action === 'delete_token') {
        requireGM();
        $tokenId = $input['id'];
        $stmt = $pdo->prepare('DELETE FROM vtt_tokens WHERE id = ?');
        $stmt->execute([$tokenId]);
        jsonResponse(['message' => 'Token removed']);
    }

    if ($action === 'toggle_scene') {
        requireGM();
        $sceneId = $input['id'];

        $pdo->prepare('UPDATE vtt_scenes SET is_active = 0 WHERE session_id = ?')->execute([$active_session_id]);
        $pdo->prepare('UPDATE vtt_scenes SET is_active = 1 WHERE id = ?')->execute([$sceneId]);

        jsonResponse(['message' => 'Scene activated']);
    }

    if ($action === 'delete_scene') {
        requireGM();
        $sceneId = $input['id'];

        // Don't delete if it's the last scene
        $stmtCount = $pdo->prepare('SELECT COUNT(*) FROM vtt_scenes WHERE session_id = ?');
        $stmtCount->execute([$active_session_id]);
        if ($stmtCount->fetchColumn() <= 1) {
            jsonResponse(['error' => 'Não é possível deletar a única cena da campanha.'], 400);
        }

        // Delete tokens first
        $pdo->prepare('DELETE FROM vtt_tokens WHERE scene_id = ?')->execute([$sceneId]);
        // Delete scene
        $stmt = $pdo->prepare('DELETE FROM vtt_scenes WHERE id = ? AND session_id = ?');
        $stmt->execute([$sceneId, $active_session_id]);

        // If we deleted the active scene, make the most recent one active
        $stmtCheck = $pdo->prepare('SELECT id FROM vtt_scenes WHERE session_id = ? AND is_active = 1');
        $stmtCheck->execute([$active_session_id]);
        if (!$stmtCheck->fetch()) {
            $pdo->prepare('UPDATE vtt_scenes SET is_active = 1 WHERE session_id = ? ORDER BY id DESC LIMIT 1')->execute([$active_session_id]);
        }

        jsonResponse(['message' => 'Scene removed']);
    }

    if ($action === 'update_grid') {
        requireGM();
        $sceneId = $input['id'];
        $enabled = (int) $input['grid_enabled'];
        $size = (int) $input['grid_size'];

        $stmt = $pdo->prepare('UPDATE vtt_scenes SET grid_enabled = ?, grid_size = ? WHERE id = ?');
        $stmt->execute([$enabled, $size, $sceneId]);

        jsonResponse(['message' => 'Grid settings updated']);
    }
}

jsonResponse(['error' => 'Invalid action or method'], 400);
