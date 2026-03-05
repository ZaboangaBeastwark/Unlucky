<?php
// We'll log the base64 string length that arrives in gm.php
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data && isset($data['avatar'])) {
    $logMsg = date('Y-m-d H:i:s') . " - Avatar Length: " . strlen($data['avatar']) . " | Action: " . $_GET['action'] . "\n";
    file_put_contents(__DIR__ . '/../uploads/payload_log.txt', $logMsg, FILE_APPEND);
}
?>