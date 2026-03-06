<?php
require_once __DIR__ . '/api/db.php';
\ = \->query('SHOW COLUMNS FROM sessions');
\ = \->fetchAll(PDO::FETCH_ASSOC);

\ = \->query('SELECT * FROM sessions');
\ = \->fetchAll(PDO::FETCH_ASSOC);

\ = \->query("SELECT id, username FROM users WHERE role = 'gm'");
\ = \->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['columns' => \, 'sessions' => \, 'gms' => \], JSON_PRETTY_PRINT);
