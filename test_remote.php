<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->prepare('SELECT * FROM sessions WHERE gm_id = 2 ORDER BY id DESC LIMIT 1');
$stmt->execute();
$session = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$session) {
    echo json_encode(["status" => "error", "message" => "NO SESSION FOUND FOR GM 2 ON THIS DB SERVER"]);
} else {
    echo json_encode(["status" => "success", "session" => $session]);
}
