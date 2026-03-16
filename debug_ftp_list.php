<?php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$conn_id = ftp_connect($ftp_server) or die("Could not connect");
if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    ftp_pasv($conn_id, true);

    echo "Root Directory:\n";
    $items = ftp_nlist($conn_id, ".");
    print_r($items);

    foreach (['www', 'public_html', 'api', 'js'] as $dir) {
        echo "\nContents of '$dir':\n";
        $items = ftp_nlist($conn_id, $dir);
        print_r($items);
    }
} else {
    echo "Login failed\n";
}
ftp_close($conn_id);
?>