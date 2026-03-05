<?php
$dir = __DIR__ . '/uploads';
echo "Checking directory: $dir\br>";
if (!is_dir($dir)) {
    echo "Directory does not exist. Attempting to create...<br>";
    if (mkdir($dir, 0777, true)) {
        echo "Created successfully.<br>";
    } else {
        echo "Failed to create directory.<br>";
    }
} else {
    echo "Directory exists. Is writable: " . (is_writable($dir) ? 'Yes' : 'No') . "<br>";
}

$files = glob($dir . '/*');
echo "Total files in uploads: " . count($files) . "<br>";
foreach ($files as $f) {
    if (strpos(basename($f), 'adv_') !== false) {
        echo basename($f) . "<br>";
    }
}
?>