<?php
require_once 'api/db.php';
try {
    $pdo->exec("ALTER TABLE characters ADD COLUMN xp INT DEFAULT 0 AFTER level");
    echo "Column 'xp' added successfully.\n";
} catch (PDOException $e) {
    echo "Error (might exist already): " . $e->getMessage() . "\n";
}
?>