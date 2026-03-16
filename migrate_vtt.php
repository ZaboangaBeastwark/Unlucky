<?php
require_once 'api/db.php';

try {
    $pdo->exec("ALTER TABLE vtt_tokens ADD COLUMN name VARCHAR(100) AFTER adversary_id");
} catch (Exception $e) {
}

try {
    $pdo->exec("ALTER TABLE vtt_tokens ADD COLUMN image_url VARCHAR(255) AFTER name");
} catch (Exception $e) {
}

try {
    $pdo->exec("ALTER TABLE vtt_tokens ADD COLUMN is_hidden TINYINT(1) DEFAULT 0");
} catch (Exception $e) {
}

try {
    $pdo->exec("ALTER TABLE vtt_tokens ADD COLUMN scale DECIMAL(3,2) DEFAULT 1.00");
} catch (Exception $e) {
}

// adversaries
try {
    $pdo->exec("ALTER TABLE adversaries ADD COLUMN current_hp INT DEFAULT 0");
} catch (Exception $e) {
}

try {
    $pdo->exec("ALTER TABLE adversaries ADD COLUMN avatar VARCHAR(255) DEFAULT ''");
} catch (Exception $e) {
}

try {
    $pdo->exec("ALTER TABLE adversaries ADD COLUMN token VARCHAR(255) DEFAULT ''");
} catch (Exception $e) {
}

// vtt_scenes
try {
    $pdo->exec("ALTER TABLE vtt_scenes ADD COLUMN grid_enabled TINYINT(1) DEFAULT 0");
} catch (Exception $e) {
}

try {
    $pdo->exec("ALTER TABLE vtt_scenes ADD COLUMN grid_size INT DEFAULT 50");
} catch (Exception $e) {
}

try {
    $pdo->exec("ALTER TABLE vtt_scenes ADD COLUMN grid_color VARCHAR(50) DEFAULT 'rgba(255,255,255,0.1)'");
} catch (Exception $e) {
}

echo "Brute force migration attempt finished.";
