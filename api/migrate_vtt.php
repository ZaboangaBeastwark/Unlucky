<?php
// api/migrate_vtt.php
require_once 'db.php';

try {
    // VTT Scenes table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vtt_scenes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            background_url TEXT,
            is_active TINYINT DEFAULT 0,
            grid_enabled TINYINT DEFAULT 1,
            grid_size INT DEFAULT 50,
            grid_type ENUM('square', 'hex') DEFAULT 'square',
            grid_color VARCHAR(20) DEFAULT 'rgba(0,0,0,0.2)',
            config JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // VTT Tokens table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vtt_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            scene_id INT NOT NULL,
            character_id INT DEFAULT NULL,
            adversary_id INT DEFAULT NULL,
            name_override VARCHAR(100),
            pos_x INT DEFAULT 0,
            pos_y INT DEFAULT 0,
            size_multiplier FLOAT DEFAULT 1.0,
            rotation INT DEFAULT 0,
            is_visible TINYINT DEFAULT 1,
            z_index INT DEFAULT 10,
            config JSON,
            FOREIGN KEY (scene_id) REFERENCES vtt_scenes(id) ON DELETE CASCADE,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
            FOREIGN KEY (adversary_id) REFERENCES adversaries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    echo json_encode(['success' => true, 'message' => 'VTT tables created successfully.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
