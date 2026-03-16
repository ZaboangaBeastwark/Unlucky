<?php
$file = $_GET['file'] ?? '';
if (strpos($file, '..') !== false || strpos($file, 'config.php') !== false) die('Forbidden');
if (file_exists($file)) {
    header('Content-Type: text/plain');
    readfile($file);
} else {
    echo "File not found: $file";
}
