<?php
require_once 'api/db.php';
try {
    $stmt = $pdo->query("SHOW VARIABLES LIKE 'max_allowed_packet'");
    $res = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "max_allowed_packet: " . ($res['Value'] / 1024 / 1024) . " MB<br>";

    $stmt2 = $pdo->query("SHOW VARIABLES LIKE 'max_allowed_packet'");
    echo "post_max_size: " . ini_get('post_max_size') . "<br>";
    echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "<br>";
    echo "memory_limit: " . ini_get('memory_limit') . "<br>";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>