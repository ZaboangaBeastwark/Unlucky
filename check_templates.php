<?php
require_once 'api/db.php';

try {
    $stmt = $pdo->query("SELECT id, name, avatar, token, type FROM adversary_templates ORDER BY id DESC LIMIT 10");
    $tpls = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<pre>";
    print_r($tpls);
    echo "</pre>";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "<br>\n";
}
?>