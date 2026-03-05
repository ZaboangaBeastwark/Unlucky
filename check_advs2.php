<?php
require_once 'api/db.php';
try {
    $stmt = $pdo->query("SELECT id, name, LENGTH(avatar) as avatar_len, LEFT(avatar, 20) as avatar_start FROM adversaries ORDER BY id DESC LIMIT 5");
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>";
    print_r($res);
    echo "</pre>";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>