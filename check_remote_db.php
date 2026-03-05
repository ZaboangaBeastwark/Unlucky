<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->query('SELECT id, username, role FROM users');
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt2 = $pdo->query('SELECT id, gm_id, name FROM sessions');
$sessions = $stmt2->fetchAll(PDO::FETCH_ASSOC);

$stmt3 = $pdo->query('SELECT session_id, user_id, name FROM characters');
$chars = $stmt3->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'users' => $users,
    'sessions' => $sessions,
    'characters' => $chars
], JSON_PRETTY_PRINT);
