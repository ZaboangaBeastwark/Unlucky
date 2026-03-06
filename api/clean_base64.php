<?php
// clean_base64.php
require_once __DIR__ . '/db.php';
// $pdo is now available and connected identically to the main app

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

function processTable($pdo, $table, $uploadDir)
{
    echo "Processing table: $table\n";
    $stmt = $pdo->query("SELECT id, avatar, token FROM $table WHERE avatar LIKE 'data:image/%' OR token LIKE 'data:image/%'");
    $rows = $stmt->fetchAll();

    $processed = 0;
    foreach ($rows as $row) {
        $updates = [];
        $params = [];

        foreach (['avatar', 'token'] as $field) {
            $val = $row[$field];
            if ($val && strpos($val, 'data:image/') === 0) {
                // Extract base64
                list($type, $data) = explode(';', $val);
                list(, $data) = explode(',', $data);
                $data = base64_decode($data);

                // Get extension
                $ext = 'png';
                if (strpos($type, 'jpeg') !== false || strpos($type, 'jpg') !== false)
                    $ext = 'jpg';
                if (strpos($type, 'webp') !== false)
                    $ext = 'webp';

                $filename = "migrated_{$table}_{$field}_{$row['id']}." . $ext;
                $filepath = $uploadDir . $filename;

                file_put_contents($filepath, $data);

                $updates[] = "$field = ?";
                $params[] = "uploads/" . $filename;
            }
        }

        if (!empty($updates)) {
            $params[] = $row['id'];
            $sql = "UPDATE $table SET " . implode(", ", $updates) . " WHERE id = ?";
            $updateStmt = $pdo->prepare($sql);
            $updateStmt->execute($params);
            $processed++;
        }
    }
    echo "Processed $processed rows in $table.\n\n";
}

echo "<pre>";
try {
    processTable($pdo, 'adversary_templates', $uploadDir);
    processTable($pdo, 'adversaries', $uploadDir);
    // Character avatars might also be large
    echo "Processing table: characters\n";
    $stmt = $pdo->query("SELECT id, avatar FROM characters WHERE avatar LIKE 'data:image/%'");
    $rows = $stmt->fetchAll();
    $processed = 0;
    foreach ($rows as $row) {
        $val = $row['avatar'];
        if ($val && strpos($val, 'data:image/') === 0) {
            list($type, $data) = explode(';', $val);
            list(, $data) = explode(',', $data);
            $data = base64_decode($data);
            $ext = 'png';
            if (strpos($type, 'jpeg') !== false || strpos($type, 'jpg') !== false)
                $ext = 'jpg';
            if (strpos($type, 'webp') !== false)
                $ext = 'webp';
            $filename = "migrated_characters_avatar_{$row['id']}." . $ext;
            $filepath = $uploadDir . $filename;
            file_put_contents($filepath, $data);
            $updateStmt = $pdo->prepare("UPDATE characters SET avatar = ? WHERE id = ?");
            $updateStmt->execute(["uploads/" . $filename, $row['id']]);
            $processed++;
        }
    }
    echo "Processed $processed rows in characters.\n";

    echo "Base64 Migration Complete!</pre>";
} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "</pre>";
}
