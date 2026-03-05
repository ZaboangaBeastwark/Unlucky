<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->prepare('SELECT * FROM sessions WHERE gm_id = ? ORDER BY id DESC LIMIT 1');
$stmt->execute([2]);
$session = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$session) {
    echo "NO SESSION FOUND FOR GM 2\n";
} else {
    echo "SESSION FOUND:\n";
    print_r($session);

    // Now test characters
    $stmtChar = $pdo->prepare('SELECT c.*, u.username as player_name FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.session_id = ?');
    $stmtChar->execute([$session['id']]);
    $characters = $stmtChar->fetchAll(PDO::FETCH_ASSOC);
    echo "\nCHARACTERS:\n";
    print_r($characters);
}
