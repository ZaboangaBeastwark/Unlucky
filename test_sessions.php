<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->query('SELECT * FROM sessions');
$sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($sessions, JSON_PRETTY_PRINT);
