<?php
// deploy.php
$ftp_server = "ftp.web15f84.uni5.net";
$ftp_user = "rpgbearhouse";
$ftp_pass = "368561@rpG";

$files = [
    "migrate_tokens.php"
];

$conn_id = ftp_connect($ftp_server) or die("Could not connect to $ftp_server");
$login_result = ftp_login($conn_id, $ftp_user, $ftp_pass);
ftp_pasv($conn_id, true);

foreach ($files as $file) {
    if (ftp_put($conn_id, $file, $file, FTP_BINARY)) {
        echo "Uploaded $file\n";
    }
}
ftp_close($conn_id);
?>