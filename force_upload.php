<?php
// force_upload.php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$conn_id = ftp_connect($ftp_server) or die("Couldn't connect to $ftp_server");
if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    ftp_pasv($conn_id, true);
    $local = __DIR__ . '/api/diag_session.php';
    $remote = 'api/diag_session.php';
    if (ftp_put($conn_id, $remote, $local, FTP_BINARY)) {
        echo "Successfully uploaded $remote\n";
    } else {
        echo "Failed to upload $remote\n";
    }
} else {
    echo "Login failed\n";
}
ftp_close($conn_id);
