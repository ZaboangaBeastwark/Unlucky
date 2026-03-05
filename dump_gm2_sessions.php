<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->prepare('SELECT id, gm_id, name, created_at FROM sessions WHERE gm_id = 2 ORDER BY id DESC');
$stmt->execute();
$sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($sessions, JSON_PRETTY_PRINT);
