<?php
require 'api/config.php';
require 'api/db.php';

echo "Starting Repair...\n";

// 1. Get Zaboanga's ID
$stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute(['Zaboanga']);
$gm = $stmt->fetch();

if (!$gm) {
    die("User Zaboanga not found in database.");
}
$gmId = $gm['id'];
echo "Found Zaboanga with ID: $gmId\n";

// 2. Find any session named 'A Centelha'
$stmt = $pdo->prepare("SELECT id FROM sessions WHERE name LIKE 'A Centelha%'");
$stmt->execute();
$sessions = $stmt->fetchAll();

if (empty($sessions)) {
    die("No session 'A Centelha' found.");
}

echo "Found " . count($sessions) . " potential sessions.\n";

foreach ($sessions as $s) {
    $sid = $s['id'];
    echo "Processing Session ID: $sid\n";

    // Update gm_id
    $pdo->prepare('UPDATE sessions SET gm_id = ? WHERE id = ?')->execute([$gmId, $sid]);

    // Check characters
    $stmtC = $pdo->prepare('SELECT count(*) FROM characters WHERE session_id = ?');
    $stmtC->execute([$sid]);
    $count = $stmtC->fetchColumn();
    echo "  -> Session $sid has $count characters.\n";
}

// 3. Delete session 1 if session 2 exists and has same name (optional cleanup)
// Let's just make sure BOTH are linked to Zaboanga so he sees them.

echo "Repair Complete. Zaboanga (ID $gmId) should now own all 'A Centelha' sessions.";
