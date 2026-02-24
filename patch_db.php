<?php
require_once 'api/db.php';

try {
    $pdo->exec("ALTER TABLE characters ADD COLUMN IF NOT EXISTS armor_base_override INT DEFAULT NULL AFTER armor_base");
    echo "Column 'armor_base_override' added successfully.";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column 'armor_base_override' already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
?>