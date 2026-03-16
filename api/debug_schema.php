<?php
// debug_schema.php
header('Content-Type: text/plain');
require_once 'db.php';

try {
    echo "--- TABLE: adversaries ---\n";
    $stmt = $pdo->query("DESCRIBE adversaries");
    while ($row = $stmt->fetch()) {
        print_r($row);
    }

    echo "\n--- TABLE: encounter_groups ---\n";
    $stmt = $pdo->query("DESCRIBE encounter_groups");
    while ($row = $stmt->fetch()) {
        print_r($row);
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>