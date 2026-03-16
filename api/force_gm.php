<?php
// force_gm.php - ATOMIC RECOVERY SCRIPT
// Directly outputs JSON for Session 5 to bypass any routing/corruption issues.
require_once __DIR__ . '/session.php';
require_once 'db.php';

error_reporting(0);
ini_set('display_errors', 0);

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'gm') {
    die("Unauthorized");
}

// 1. Session 5 Info
$stmt = $pdo->prepare('SELECT * FROM sessions WHERE id = 5');
$stmt->execute();
$session = $stmt->fetch(PDO::FETCH_ASSOC);

// 2. Characters for Session 5
$stmtChar = $pdo->prepare('SELECT c.*, u.username as player_name FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.session_id = 5');
$stmtChar->execute();
$characters = $stmtChar->fetchAll(PDO::FETCH_ASSOC);
foreach ($characters as &$char) {
    $char['attributes'] = json_decode($char['attributes'] ?? '{}', true);
    $char['inventory'] = json_decode($char['inventory'] ?? '{"equipped":[],"bag":[],"gold":0}', true);
    $char['experiences'] = json_decode($char['experiences'] ?? '[]', true);
    $char['cards'] = json_decode($char['cards'] ?? '[]', true);
    $char['roleplay_answers'] = json_decode($char['roleplay_answers'] ?? '[]', true);
}

// 3. Adversaries
$stmtAdv = $pdo->prepare('SELECT * FROM adversaries WHERE session_id = 5');
$stmtAdv->execute();
$adversaries = $stmtAdv->fetchAll();

// 4. Encounter Groups
$stmtGroups = $pdo->prepare('SELECT * FROM encounter_groups WHERE session_id = 5');
$stmtGroups->execute();
$encounter_groups = $stmtGroups->fetchAll(PDO::FETCH_ASSOC);

// 5. Bestiary
$stmtTpl = $pdo->prepare('SELECT * FROM adversary_templates WHERE gm_id = ? OR gm_id IS NULL');
$stmtTpl->execute([$_SESSION['user_id']]);
$bestiary = $stmtTpl->fetchAll(PDO::FETCH_ASSOC);
foreach ($bestiary as &$beast) {
    $beast['attack'] = json_decode($beast['attack'] ?? '{}', true);
    $beast['experiences'] = json_decode($beast['experiences'] ?? '[]', true);
    $beast['abilities'] = json_decode($beast['abilities'] ?? '[]', true);
}

// FORCE CLEAN OUTPUT
while (ob_get_level())
    ob_end_clean();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

echo json_encode([
    'session' => $session,
    'characters' => $characters,
    'adversaries' => $adversaries,
    'bestiary' => $bestiary,
    'encounter_groups' => $encounter_groups,
    'all_sessions' => [['id' => 5, 'name' => $session['name']]]
]);
exit;
?>