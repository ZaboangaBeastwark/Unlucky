<?php
/**
 * api/v5_gm_data.php - EXTREMELY SAFE DATA ENDPOINT
 * This file is designed to be proof against any output corruption.
 */

// Start buffering immediately to catch any accidental output from required files
ob_start();

require_once __DIR__ . '/session.php';
require_once __DIR__ . '/db.php';

// Suppress all errors - we want zero output except our JSON
error_reporting(0);
ini_set('display_errors', 0);

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'gm') {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Release session lock so other requests (like polling) can execute
session_write_close();

try {
    // FORCE SESSION 5
    $target_session_id = 5;

    // 1. Session Info
    $stmt = $pdo->prepare('SELECT * FROM sessions WHERE id = ?');
    $stmt->execute([$target_session_id]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. All Sessions (minimal for the UI)
    $stmtAll = $pdo->prepare('SELECT id, name FROM sessions WHERE gm_id = ? ORDER BY id DESC');
    $stmtAll->execute([$_SESSION['user_id']]);
    $all_sessions = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

    // 3. Characters
    $stmtChar = $pdo->prepare('SELECT c.*, u.username as player_name FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.session_id = ?');
    $stmtChar->execute([$target_session_id]);
    $characters = $stmtChar->fetchAll(PDO::FETCH_ASSOC);

    foreach ($characters as &$char) {
        $char['attributes'] = json_decode($char['attributes'] ?? '{}', true);
        $char['inventory'] = json_decode($char['inventory'] ?? '{"equipped":[],"bag":[],"gold":0}', true);
        $char['experiences'] = json_decode($char['experiences'] ?? '[]', true);
        $char['cards'] = json_decode($char['cards'] ?? '[]', true);
        $char['roleplay_answers'] = json_decode($char['roleplay_answers'] ?? '[]', true);
    }

    // 4. Adversaries
    $stmtAdv = $pdo->prepare('SELECT * FROM adversaries WHERE session_id = ?');
    $stmtAdv->execute([$target_session_id]);
    $adversaries = $stmtAdv->fetchAll();

    // 5. Encounter Groups
    $stmtGroups = $pdo->prepare('SELECT * FROM encounter_groups WHERE session_id = ?');
    $stmtGroups->execute([$target_session_id]);
    $encounter_groups = $stmtGroups->fetchAll(PDO::FETCH_ASSOC);

    // 6. Bestiary (always load for GM)
    $stmtTpl = $pdo->prepare('SELECT * FROM adversary_templates WHERE gm_id = ? OR gm_id IS NULL');
    $stmtTpl->execute([$_SESSION['user_id']]);
    $bestiary = $stmtTpl->fetchAll(PDO::FETCH_ASSOC);

    foreach ($bestiary as &$beast) {
        $beast['attack'] = json_decode($beast['attack'] ?? '{}', true);
        $beast['experiences'] = json_decode($beast['experiences'] ?? '[]', true);
        $beast['abilities'] = json_decode($beast['abilities'] ?? '[]', true);
    }

    $response = [
        'session' => $session,
        'all_sessions' => $all_sessions,
        'characters' => $characters,
        'adversaries' => $adversaries,
        'bestiary' => $bestiary,
        'encounter_groups' => $encounter_groups,
        'emergency_mode' => true,
        'v' => 5
    ];

    // CLEAN BUFFER COMPLETELY
    while (ob_get_level()) {
        ob_end_clean();
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($response);
    exit;

} catch (Exception $e) {
    while (ob_get_level()) {
        ob_end_clean();
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Server Error: ' . $e->getMessage()]);
    exit;
}
