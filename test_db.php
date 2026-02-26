<?php
require_once 'api/db.php';
try {
    $stmt = $pdo->query('SELECT COUNT(*) FROM users');
    echo "Users table OK. count: " . $stmt->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "DB ERROR: " . $e->getMessage() . "\n";
}
try {
    $stmt = $pdo->query('SELECT COUNT(*) FROM characters');
    echo "Characters table OK. count: " . $stmt->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "DB ERROR: " . $e->getMessage() . "\n";
}
