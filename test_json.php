<?php
require 'api/config.php';
require 'api/db.php';
$stmt = $pdo->prepare('SELECT * FROM sessions WHERE gm_id = ? ORDER BY id DESC LIMIT 1');
$stmt->execute([2]);
$session = $stmt->fetch(PDO::FETCH_ASSOC);

$stmtChar = $pdo->prepare('SELECT c.*, u.username as player_name FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.session_id = ?');
$stmtChar->execute([$session['id']]);
$characters = $stmtChar->fetchAll(PDO::FETCH_ASSOC);

// Decode JSON fields for each character so the frontend receives them properly
foreach ($characters as &$char) {
    $char['attributes'] = json_decode($char['attributes'] ?? '{}', true);
    $char['inventory'] = json_decode($char['inventory'] ?? '{"equipped":[],"bag":[],"gold":0}', true);
    $char['experiences'] = json_decode($char['experiences'] ?? '[]', true);
    $char['cards'] = json_decode($char['cards'] ?? '[]', true);
    $char['roleplay_answers'] = json_decode($char['roleplay_answers'] ?? '[]', true);
}

$stmtAdv = $pdo->prepare('SELECT * FROM adversaries WHERE session_id = ?');
$stmtAdv->execute([$session['id']]);
$adversaries = $stmtAdv->fetchAll(PDO::FETCH_ASSOC);

$stmtTpl = $pdo->prepare('SELECT * FROM adversary_templates WHERE gm_id = ? OR gm_id IS NULL ORDER BY name ASC');
$stmtTpl->execute([2]);
$bestiary = $stmtTpl->fetchAll(PDO::FETCH_ASSOC);

foreach ($bestiary as &$beast) {
    $beast['experiences'] = json_decode($beast['experiences'] ?? '[]', true);
    $beast['abilities'] = json_decode($beast['abilities'] ?? '[]', true);
    $beast['attack'] = json_decode($beast['attack'] ?? '{}', true);
}

$data = [
    'session' => $session,
    'characters' => $characters,
    'adversaries' => $adversaries,
    'bestiary' => $bestiary
];

$json = json_encode($data);
if ($json === false) {
    echo "ERROR: " . json_last_error_msg() . "\n";
} else {
    echo $json;
}
