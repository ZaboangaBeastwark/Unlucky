<?php
// migrate_tokens.php
require_once 'api/db.php';

try {
    $pdo->exec("ALTER TABLE vtt_tokens ADD COLUMN IF NOT EXISTS is_hidden TINYINT(1) DEFAULT 0");
    $pdo->exec("ALTER TABLE vtt_tokens ADD COLUMN IF NOT EXISTS scale FLOAT DEFAULT 1.0");
    echo "Migration successful: is_hidden and scale columns added to vtt_tokens.";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage();
}
?>