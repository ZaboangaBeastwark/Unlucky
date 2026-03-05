<?php
require_once 'api/db.php';
try {
    $stmt = $pdo->query("SELECT id, name, LENGTH(avatar) as avatar_len, LEFT(avatar, 20) as avatar_start FROM adversary_templates WHERE avatar IS NOT NULL AND avatar != '' ORDER BY id DESC LIMIT 5");
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "TEMPLATES COM IMAGEM BASE 64:<br>";
    echo "<pre>";
    print_r($res);
    echo "</pre>";

    $stmt2 = $pdo->query("SELECT id, name, LENGTH(avatar) as avatar_len, LEFT(avatar, 20) as avatar_start FROM adversaries WHERE avatar IS NOT NULL AND avatar != '' ORDER BY id DESC LIMIT 5");
    $res2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo "ADVERSARIES ATIVOS COM IMAGEM BASE 64:<br>";
    echo "<pre>";
    print_r($res2);
    echo "</pre>";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>