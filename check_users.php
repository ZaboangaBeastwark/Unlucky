<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->query('SELECT id, username, role FROM users');
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "USERS:\n";
print_r($users);

$stmt2 = $pdo->query('SELECT * FROM sessions');
$sessions = $stmt2->fetchAll(PDO::FETCH_ASSOC);
echo "\nSESSIONS:\n";
print_r($sessions);
