<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->query('SELECT id, gm_id, name, created_at FROM sessions ORDER BY id DESC');
$sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(['sessions' => $sessions], JSON_PRETTY_PRINT);
