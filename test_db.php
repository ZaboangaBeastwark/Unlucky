<?php
require_once 'api/db.php';
$stmt = $pdo->query("SELECT id, name, user_id, session_id, session_status FROM characters WHERE name LIKE '%Melvin%'");
$char = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Melvin DB Data:\n";
print_r($char);

$stmt2 = $pdo->query("SELECT id, name FROM sessions WHERE name LIKE '%A Centelha%'");
$sess = $stmt2->fetch(PDO::FETCH_ASSOC);
echo "\nA Centelha DB Data:\n";
print_r($sess);

// Check if Melvin's user_id matches the owner in the screenshot
$stmt3 = $pdo->query("SELECT id, username FROM users WHERE id = " . ($char['user_id'] ?? 0));
print_r($stmt3->fetch(PDO::FETCH_ASSOC));
?>