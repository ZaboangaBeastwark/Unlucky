<?php
require_once __DIR__ . '/db.php';

try {
    $sql = "
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        session_name VARCHAR(255) NULL,
        character_id INT NULL,
        user_id INT NOT NULL,
        user_role VARCHAR(20) NOT NULL,
        actor_name VARCHAR(100) NOT NULL,
        character_name VARCHAR(100) NULL,
        action_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($sql);
    echo "Tabela audit_logs criada com sucesso.\n";
} catch (Exception $e) {
    die("Erro ao criar a tabela audit_logs: " . $e->getMessage());
}
?>