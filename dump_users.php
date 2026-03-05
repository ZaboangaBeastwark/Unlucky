<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->query('SELECT id, username, role FROM users');
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($users, JSON_PRETTY_PRINT);
