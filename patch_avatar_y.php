<?php
require_once 'api/db.php';
try {
    $pdo->exec("ALTER TABLE characters ADD COLUMN avatar_y INT DEFAULT 50");
    echo "Column 'avatar_y' added successfully.\n";
} catch (PDOException $e) {
    echo "Error (might exist already): " . $e->getMessage() . "\n";
}
?>