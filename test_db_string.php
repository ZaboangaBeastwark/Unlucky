<?php
require_once 'api/db.php';

// Simulate an update to the 'Guarda Arqueiro' (ID 31)
$id = 31;
$avatar = "uploads/avatar_adv_test_manual.png";

try {
    $stmt = $pdo->prepare('UPDATE adversary_templates SET avatar=?, token=? WHERE id = ?');
    $stmt->execute([$avatar, $avatar, $id]);
    echo "Updated template 31. Rows affected: " . $stmt->rowCount() . "<br>";

    $stmt2 = $pdo->query("SELECT avatar, token FROM adversary_templates WHERE id = 31");
    $res = $stmt2->fetch(PDO::FETCH_ASSOC);
    echo "Current DB state for ID 31:<br>";
    print_r($res);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>