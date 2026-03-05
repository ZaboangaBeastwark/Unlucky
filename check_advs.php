<?php
require_once 'api/db.php';

try {
    // See all adversaries exactly as they are in the DB
    $stmt = $pdo->query("SELECT id, name, template_id, avatar, token FROM adversaries ORDER BY id DESC LIMIT 10");
    $advs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<pre>";
    print_r($advs);
    echo "</pre>";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "<br>\n";
}
?>