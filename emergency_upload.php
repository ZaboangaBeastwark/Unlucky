<?php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$files = [
    'api/gm.php',
    'api/force_gm.php',
    'js/gm.js'
];

$conn_id = ftp_connect($ftp_server) or die("Could not connect");
if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    ftp_pasv($conn_id, true);
    foreach ($files as $file) {
        $local = __DIR__ . '/' . $file;
        $remote = $file; // Roots are confirmed to be direct
        if (ftp_put($conn_id, $remote, $local, FTP_BINARY)) {
            echo "Uploaded $file\n";
        } else {
            echo "Failed to upload $file\n";
        }
    }
} else {
    echo "Login failed\n";
}
ftp_close($conn_id);
?>