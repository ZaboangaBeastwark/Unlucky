<?php
require_once __DIR__ . '/api/db.php';
\ = \->prepare('SELECT u.id as user_id, u.username, s.id as session_id, s.name as session_name FROM users u LEFT JOIN sessions s ON u.id = s.gm_id WHERE u.username = \'Zaboanga\'');
\->execute();
\ = \->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(\, JSON_PRETTY_PRINT);
