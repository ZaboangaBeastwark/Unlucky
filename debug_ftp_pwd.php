<?php
// debug_ftp_pwd.php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$conn_id = ftp_connect($ftp_server) or die("Couldn't connect to $ftp_server");
if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    echo "Current directory: " . ftp_pwd($conn_id) . "\n";
    $items = ftp_nlist($conn_id, ".");
    echo "Files in current dir:\n";
    print_r($items);
} else {
    echo "Login failed\n";
}
ftp_close($conn_id);
