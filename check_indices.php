<?php
if (file_exists('index.htm')) {
    echo "--- index.htm ---\n";
    echo file_get_contents('index.htm');
}
if (file_exists('index.html')) {
    echo "\n\n--- index.html ---\n";
    echo file_get_contents('index.html');
}
?>