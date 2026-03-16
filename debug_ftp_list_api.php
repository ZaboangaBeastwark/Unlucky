<?php
// debug_ftp_list_api.php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$conn_id = ftp_connect($ftp_server) or die("Couldn't connect to $ftp_server");
if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    ftp_pasv($conn_id, true);
    echo "Current FTP PWD: " . ftp_pwd($conn_id) . "\n";
    echo "Files in api/ folder:\n";
    print_r(ftp_nlist($conn_id, "api"));
} else {
    echo "Login failed\n";
}
ftp_close($conn_id);
