<?php
require_once __DIR__ . '/session.php'; // ESSENCIAL: inicia a sessão PHP
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// Verificação de autenticação inline 
// (NÃO usar require_once 'auth.php' pois auth.php é um controlador completo com exit no final!)
if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Não autenticado. Faça login novamente.'], 401);
}

$action = $_REQUEST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// The logAudit function is now globally available via db.php

if ($method === 'GET' && $action === 'get_logs') {
    $session_id = $_GET['session_id'] ?? null;
    $search = $_GET['search'] ?? '';
    $type_filter = $_GET['type'] ?? '';
    $role_filter = $_GET['role'] ?? '';
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    $limit = 50;
    $offset = ($page - 1) * $limit;

    if (!$session_id) {
        jsonResponse(['error' => 'ID da sessão não fornecido.'], 400);
    }

    // Verify access: GM must own the session; players are not allowed here
    if ($_SESSION['role'] === 'gm') {
        $stmt = $pdo->prepare('SELECT id FROM sessions WHERE id = ? AND gm_id = ?');
        $stmt->execute([$session_id, $_SESSION['user_id']]);
        if (!$stmt->fetchColumn()) {
            jsonResponse(['error' => 'Acesso negado para esta sessão.'], 403);
        }
    } else {
        jsonResponse(['error' => 'Acesso restrito ao mestre.'], 403);
    }

    // Build query dynamically
    $sql = "SELECT * FROM audit_logs WHERE session_id = :session_id ";
    $params = [':session_id' => $session_id];

    if ($search) {
        $sql .= " AND (description LIKE :search OR actor_name LIKE :search OR character_name LIKE :search) ";
        $params[':search'] = "%$search%";
    }
    if ($type_filter) {
        $sql .= " AND action_type = :action_type ";
        $params[':action_type'] = $type_filter;
    }
    if ($role_filter) {
        $sql .= " AND user_role = :user_role ";
        $params[':user_role'] = $role_filter;
    }

    $sql .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);

    // Bind generic params
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    // Bind limits as INT
    $stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int) $offset, PDO::PARAM_INT);

    $stmt->execute();
    $logs = $stmt->fetchAll();

    // Get total count for pagination
    $countSql = "SELECT COUNT(*) FROM audit_logs WHERE session_id = :session_id ";
    $countParams = [':session_id' => $session_id];
    if ($search) {
        $countSql .= " AND (description LIKE :search OR actor_name LIKE :search OR character_name LIKE :search) ";
        $countParams[':search'] = "%$search%";
    }
    if ($type_filter) {
        $countSql .= " AND action_type = :type ";
        $countParams[':type'] = $type_filter;
    }
    if ($role_filter) {
        $countSql .= " AND user_role = :role ";
        $countParams[':role'] = $role_filter;
    }

    $cStmt = $pdo->prepare($countSql);
    $cStmt->execute($countParams);
    $total_logs = $cStmt->fetchColumn();

    $total_pages = ceil($total_logs / $limit);

    jsonResponse([
        'logs' => $logs,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_items' => $total_logs
        ]
    ]);
    exit;
}

jsonResponse(['error' => 'Invalid action in audit.php'], 400);
?>