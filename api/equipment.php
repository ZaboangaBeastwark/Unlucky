<?php
// api/equipment.php
require_once __DIR__ . '/session.php';
require_once 'db.php';

header('Content-Type: application/json');


if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$user_role = $_SESSION['role'] ?? 'player';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    if ($method === 'GET' && $action === 'list') {
        // Players only see visible items, GMs see everything
        if ($user_role === 'gm') {
            $stmt = $pdo->query("SELECT * FROM equipment ORDER BY category, tier, name");
        } else {
            $stmt = $pdo->query("SELECT * FROM equipment WHERE is_visible = 1 ORDER BY category, tier, name");
        }

        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON field for frontend convenience
        foreach ($items as &$item) {
            $item['data'] = json_decode($item['data'], true);
            $item['is_visible'] = (bool) $item['is_visible'];
        }

        jsonResponse(['equipment' => $items]);
    }

    if ($method === 'GET' && $action === 'list_creation') {
        // Character creation MUST see all level 1 gear regardless of GM's shop visibility settings.
        // We'll just fetch everything. player.js filters by tier 1 anyway.
        $stmt = $pdo->query("SELECT * FROM equipment ORDER BY category, tier, name");
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items as &$item) {
            $item['data'] = json_decode($item['data'], true);
            $item['is_visible'] = (bool) $item['is_visible'];
        }

        jsonResponse(['equipment' => $items]);
    }

    // ==========================================
    // GM ONLY ACTIONS BELOW
    // ==========================================
    if ($user_role !== 'gm') {
        jsonResponse(['error' => 'Forbidden: Only GMs can modify the catalog'], 403);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    if ($method === 'POST') {
        if ($action === 'create') {
            $name = $input['name'] ?? '';
            $category = $input['category'] ?? 'adventure_item';
            $tier = (int) ($input['tier'] ?? 1);
            $cost_base = $input['cost_base'] ?? '0';
            $description = $input['description'] ?? '';
            $data = $input['data'] ?? [];
            $is_visible = isset($input['is_visible']) ? (int) $input['is_visible'] : 1;

            if (empty($name)) {
                jsonResponse(['error' => 'Item name is required'], 400);
            }

            $stmt = $pdo->prepare("INSERT INTO equipment (name, category, tier, cost_base, description, data, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $name,
                $category,
                $tier,
                $cost_base,
                $description,
                json_encode($data, JSON_UNESCAPED_UNICODE),
                $is_visible
            ]);

            jsonResponse(['message' => 'Item created successfully', 'id' => $pdo->lastInsertId()]);
        } elseif ($action === 'update') {
            $id = $input['id'] ?? null;
            if (!$id)
                jsonResponse(['error' => 'Item ID required'], 400);

            $name = $input['name'] ?? '';
            $category = $input['category'] ?? 'adventure_item';
            $tier = (int) ($input['tier'] ?? 1);
            $cost_base = $input['cost_base'] ?? '0';
            $description = $input['description'] ?? '';
            $data = $input['data'] ?? [];

            $stmt = $pdo->prepare("UPDATE equipment SET name=?, category=?, tier=?, cost_base=?, description=?, data=? WHERE id=?");
            $stmt->execute([
                $name,
                $category,
                $tier,
                $cost_base,
                $description,
                json_encode($data, JSON_UNESCAPED_UNICODE),
                $id
            ]);

            jsonResponse(['message' => 'Item updated successfully']);
        } elseif ($action === 'toggle_visibility') {
            $id = $input['id'] ?? null;
            $is_visible = isset($input['is_visible']) ? (int) $input['is_visible'] : 1;

            if (!$id)
                jsonResponse(['error' => 'Item ID required'], 400);

            $stmt = $pdo->prepare("UPDATE equipment SET is_visible = ? WHERE id = ?");
            $stmt->execute([$is_visible, $id]);

            jsonResponse(['message' => 'Visibility updated successfully']);
        } elseif ($action === 'toggle_visibility_bulk') {
            $ids = $input['ids'] ?? [];
            $is_visible = isset($input['is_visible']) ? (int) $input['is_visible'] : 1;

            if (empty($ids) || !is_array($ids)) {
                jsonResponse(['error' => 'Array of Item IDs required'], 400);
            }

            $inQuery = implode(',', array_fill(0, count($ids), '?'));
            $params = array_merge([$is_visible], $ids);

            $stmt = $pdo->prepare("UPDATE equipment SET is_visible = ? WHERE id IN ($inQuery)");
            $stmt->execute($params);

            jsonResponse(['message' => 'Bulk visibility updated successfully']);
        } elseif ($action === 'delete') {
            $id = $input['id'] ?? null;
            if (!$id)
                jsonResponse(['error' => 'Item ID required'], 400);

            $stmt = $pdo->prepare("DELETE FROM equipment WHERE id = ?");
            $stmt->execute([$id]);

            jsonResponse(['message' => 'Item deleted successfully']);
        }
    }

    jsonResponse(['error' => 'Invalid action or method'], 400);

} catch (PDOException $e) {
    if ($e->getCode() == 23000) { // Integrity constraint violation (usually duplicate name)
        jsonResponse(['error' => 'An item with this name already exists in the catalog.'], 400);
    }
    jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
