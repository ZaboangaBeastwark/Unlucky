<?php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$files_to_upload = [
    'index.html',
    'css/style.css',
    'js/gm.js',
    'js/player.js',
    'api/gm.php',
    'api/character.php',
    'api/equipment.php',
    'fix_legacy_sessions.php'
];

$conn_id = ftp_connect($ftp_server) or die("Couldn't connect to $ftp_server");

if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    echo "Connected as $ftp_user@$ftp_server\n";

    $webroot = ""; // Try root dir directly

    foreach ($files_to_upload as $file) {
        $remote_file = $webroot . $file;
        $local_file = __DIR__ . '/' . $file;

        if (strpos($file, '/') !== false) {
            $parts = explode('/', $file);
            $dir = $webroot . $parts[0];
            @ftp_mkdir($conn_id, $dir);
        }

        if (ftp_put($conn_id, $remote_file, $local_file, FTP_BINARY)) {
            echo "Successfully uploaded $file\n";
        } else {
            echo "There was a problem while uploading $file\n";
        }
    }

} else {
    echo "Couldn't connect as $ftp_user\n";
}

ftp_close($conn_id);
?>