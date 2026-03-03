<?php
require_once 'api/db.php';
try {
    $pdo->exec("ALTER TABLE characters ADD COLUMN can_level_up BOOLEAN DEFAULT FALSE");
    echo "Column 'can_level_up' added successfully.\n";
} catch (PDOException $e) {
    echo "Error (might exist already): " . $e->getMessage() . "\n";
}
?>