<?php
/**
 * migrate_images_to_local.php
 * Reads Base64 avatar/token images from the REMOTE database,
 * saves them as files in Unlucky-Local/uploads/,
 * and updates the LOCAL database to reference those file paths.
 * 
 * Run from: Protótipo DaggerHeart directory
 *   php migrate_images_to_local.php
 */

// Remote DB
$REMOTE = new PDO(
    "mysql:host=mysql.rpgbearhouse.app.br;dbname=rpgbearhouse;charset=utf8mb4",
    'rpgbearhouse',
    'DaggerHeartDB2026',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Local DB
$LOCAL = new PDO(
    "mysql:host=localhost;dbname=unlucky_local;charset=utf8mb4",
    'root',
    '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Target directory
$uploads_dir = realpath(__DIR__ . '/../Unlucky-Local/uploads');
if (!$uploads_dir) {
    mkdir(__DIR__ . '/../Unlucky-Local/uploads', 0777, true);
    $uploads_dir = realpath(__DIR__ . '/../Unlucky-Local/uploads');
}
echo "Saving images to: $uploads_dir\n\n";

$ok = 0;
$skip = 0;
$fail = 0;

/**
 * Saves a base64 image string to a file and returns the path relative to app root.
 */
function saveBase64Image($base64data, $prefix, $id, $field, $uploads_dir)
{
    if (empty($base64data))
        return null;

    // Detect format from data URI or guess
    $extension = 'png';
    if (strpos($base64data, 'data:image/jpeg') !== false || strpos($base64data, 'data:image/jpg') !== false) {
        $extension = 'jpg';
    } elseif (strpos($base64data, 'data:image/webp') !== false) {
        $extension = 'webp';
    } elseif (strpos($base64data, 'data:image/gif') !== false) {
        $extension = 'gif';
    }

    // Strip data URI header if present
    $imageData = $base64data;
    if (preg_match('/^data:image\/\w+;base64,/', $base64data)) {
        $imageData = preg_replace('/^data:image\/\w+;base64,/', '', $base64data);
    }

    // Validate and decode
    $decoded = base64_decode($imageData, true);
    if (!$decoded || strlen($decoded) < 100)
        return null;

    $filename = "{$prefix}_{$field}_{$id}.{$extension}";
    $filepath = $uploads_dir . DIRECTORY_SEPARATOR . $filename;
    file_put_contents($filepath, $decoded);

    return 'uploads/' . $filename;
}

// === Process adversary_templates ===
echo "--- adversary_templates ---\n";
$rows = $REMOTE->query("SELECT id, avatar, token FROM adversary_templates WHERE avatar IS NOT NULL OR token IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    $id = $row['id'];
    $updates = [];

    foreach (['avatar', 'token'] as $field) {
        if (empty($row[$field]))
            continue;

        $path = saveBase64Image($row[$field], 'adv_template', $id, $field, $uploads_dir);
        if ($path) {
            $updates[$field] = $path;
            echo "  OK [{$field}]: template #{$id} → {$path}\n";
            $ok++;
        } else {
            echo "  SKIP [{$field}]: template #{$id} (empty/invalid)\n";
            $skip++;
        }
    }

    if (!empty($updates)) {
        $setClauses = implode(', ', array_map(fn($c) => "`$c` = ?", array_keys($updates)));
        $vals = array_values($updates);
        $vals[] = $id;
        $LOCAL->prepare("UPDATE adversary_templates SET $setClauses WHERE id = ?")->execute($vals);
    }
}

// === Process adversaries (instances) ===
echo "\n--- adversaries ---\n";
$rows = $REMOTE->query("SELECT id, avatar, token FROM adversaries WHERE avatar IS NOT NULL OR token IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    $id = $row['id'];
    $updates = [];

    foreach (['avatar', 'token'] as $field) {
        if (empty($row[$field]))
            continue;

        $path = saveBase64Image($row[$field], 'adversary', $id, $field, $uploads_dir);
        if ($path) {
            $updates[$field] = $path;
            echo "  OK [{$field}]: adversary #{$id} → {$path}\n";
            $ok++;
        } else {
            echo "  SKIP [{$field}]: adversary #{$id} (empty/invalid)\n";
            $skip++;
        }
    }

    if (!empty($updates)) {
        $setClauses = implode(', ', array_map(fn($c) => "`$c` = ?", array_keys($updates)));
        $vals = array_values($updates);
        $vals[] = $id;
        $LOCAL->prepare("UPDATE adversaries SET $setClauses WHERE id = ?")->execute($vals);
    }
}

// === Process characters (avatars) ===
echo "\n--- characters ---\n";
$rows = $REMOTE->query("SELECT id, avatar FROM characters WHERE avatar IS NOT NULL AND avatar != ''")->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    $id = $row['id'];
    $path = saveBase64Image($row['avatar'], 'character', $id, 'avatar', $uploads_dir);
    if ($path) {
        echo "  OK [avatar]: character #{$id} → {$path}\n";
        $LOCAL->prepare("UPDATE characters SET avatar = ? WHERE id = ?")->execute([$path, $id]);
        $ok++;
    } else {
        echo "  SKIP [avatar]: character #{$id}\n";
        $skip++;
    }
}

echo "\n======================";
echo "\nDone! Saved: $ok | Skipped: $skip | Failed: $fail\n";
echo "Images are in: $uploads_dir\n";
?>