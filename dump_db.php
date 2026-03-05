<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->query('SELECT id, username, role FROM users');
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt2 = $pdo->query('SELECT id, gm_id, name FROM sessions');
$sessions = $stmt2->fetchAll(PDO::FETCH_ASSOC);

file_put_contents('db_dump.json', json_encode(['users' => $users, 'sessions' => $sessions], JSON_PRETTY_PRINT));
echo "Done.";
