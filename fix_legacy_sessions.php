<?php
// fix_legacy_sessions.php
require_once 'api/db.php';

try {
    // Legacy characters joined a session but didn't get a status because the concept
    // of pending/approved was added after the fact.
    // If they have a session_id but session_status is NULL, let's auto-approve them
    // so the GM can see them.
    $stmt = $pdo->prepare("UPDATE characters SET session_status = 'approved' WHERE session_id IS NOT NULL AND (session_status IS NULL OR session_status = '')");
    $stmt->execute();
    $count = $stmt->rowCount();

    echo "Successfully updated $count legacy characters to 'approved'.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>