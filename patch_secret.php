<?php
try {
    $dbPath = __DIR__ . '/database/daggerheart.db';
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $db->exec("ALTER TABLE characters ADD COLUMN secret_note TEXT");
    echo "Successfully added secret_note column to characters table.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'duplicate column name') !== false) {
        echo "Column secret_note already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
