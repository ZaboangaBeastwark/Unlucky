<?php
// full_deploy.php - Deploys ALL critical production files at once.
$ftp_server = "ftp.web15f84.uni5.net";
$ftp_user = "rpgbearhouse";
$ftp_pass = "368561@rpG";

$conn_id = ftp_connect($ftp_server) or die("Could not connect to $ftp_server");
if (!ftp_login($conn_id, $ftp_user, $ftp_pass))
    die("FTP login failed");

ftp_pasv($conn_id, true);

// ALL critical production files to deploy
$files = [
    // Core API files
    'api/db.php',
    'api/session.php',
    'api/config.php',
    'api/auth.php',
    'api/gm.php',
    'api/character.php',
    'api/equipment.php',
    // Frontend JS
    'js/api.js',
    'js/gm.js',
    'js/player.js',
    'js/login.js',
    'js/vtt.js',
    // Frontend HTML/CSS
    'index.html',
    'vtt.html',
    'vtt_control.html',
    'vtt.css',
];

$ok = 0;
$fail = 0;
foreach ($files as $file) {
    $local = __DIR__ . '/' . $file;
    if (!file_exists($local)) {
        echo "SKIP (not found): $file\n";
        continue;
    }
    if (ftp_put($conn_id, $file, $local, FTP_BINARY)) {
        echo "OK: $file\n";
        $ok++;
    } else {
        echo "FAIL: $file\n";
        $fail++;
    }
}

echo "\nDone. Uploaded: $ok, Failed: $fail\n";
ftp_close($conn_id);
?>