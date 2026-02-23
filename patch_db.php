<?php
require_once 'api/db.php';

try {
    $pdo->exec("ALTER TABLE characters ADD COLUMN IF NOT EXISTS roleplay_answers JSON AFTER cards");
    echo "Column 'roleplay_answers' added successfully.";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column 'roleplay_answers' already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
?>