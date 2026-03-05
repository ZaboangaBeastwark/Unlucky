<?php
$ftp_server = "ftp.web15f84.uni5.net";
$ftp_user = "rpgbearhouse";
$ftp_pass = "368561@rpG";

$conn_id = ftp_connect($ftp_server) or die("Couldn't connect to $ftp_server");
if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    ftp_pasv($conn_id, true);
    $local_file = "downloaded_gm.php";
    $server_file = "api/gm.php";

    if (ftp_get($conn_id, $local_file, $server_file, FTP_BINARY)) {
        echo "Successfully downloaded $server_file\n";
    } else {
        echo "Error downloading $server_file\n";
    }
} else {
    echo "Couldn't connect as $ftp_user\n";
}
ftp_close($conn_id);
