<?php
require_once 'api/db.php';
$stmt = $pdo->query("SELECT id, name, avatar, token FROM adversary_templates ORDER BY id DESC LIMIT 5");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt2 = $pdo->query("SELECT id, name, avatar, token FROM adversaries ORDER BY id DESC LIMIT 5");
print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
?>