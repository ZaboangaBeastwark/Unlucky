<?php
require_once __DIR__ . '/api/db.php';

try {
    $pdo->exec("ALTER TABLE characters ADD COLUMN secret_note TEXT");
    echo "Successfully added secret_note column to characters table in MySQL.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false || strpos($e->getMessage(), 'already exists') !== false) {
        echo "Column secret_note already exists in MySQL.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
