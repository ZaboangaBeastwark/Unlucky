<?php
require_once 'api/db.php';
try {
    $pdo->exec("ALTER TABLE characters ADD COLUMN avatar VARCHAR(255) DEFAULT NULL");
    echo "Column 'avatar' added successfully.\n";
} catch (PDOException $e) {
    echo "Error (might exist already): " . $e->getMessage() . "\n";
}
?>