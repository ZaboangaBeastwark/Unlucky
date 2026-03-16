<?php
// emergency_upload_restoration.php
$ftp_server = "ftp.web15f84.uni5.net";
$ftp_user = "rpgbearhouse";
$ftp_pass = "368561@rpG";

$conn_id = ftp_connect($ftp_server) or die("Could not connect to $ftp_server");
$login_result = ftp_login($conn_id, $ftp_user, $ftp_pass);

if (!$login_result)
    die("FTP login failed");

ftp_pasv($conn_id, true);

$files = [
    'api/db.php',
    'api/session.php',
    'api/config.php',
    'api/gm.php',
    'js/gm.js'
];

foreach ($files as $file) {
    $local_file = __DIR__ . '/' . $file;
    $remote_file = $file;

    if (ftp_put($conn_id, $remote_file, $local_file, FTP_BINARY)) {
        echo "Uploaded $file\n";
    } else {
        echo "Error uploading $file (Remote: $remote_file)\n";
    }
}

ftp_close($conn_id);
?>