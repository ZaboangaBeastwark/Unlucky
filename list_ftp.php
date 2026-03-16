<?php
// list_ftp.php
$ftp_server = "ftp.web15f84.uni5.net";
$ftp_user = "rpgbearhouse";
$ftp_pass = "368561@rpG";

$conn_id = ftp_connect($ftp_server) or die("Could not connect to $ftp_server");
$login_result = ftp_login($conn_id, $ftp_user, $ftp_pass);

if (!$login_result)
    die("FTP login failed");

ftp_pasv($conn_id, true);

echo "Listing contents of root:\n";
$contents = ftp_nlist($conn_id, ".");
print_r($contents);

ftp_close($conn_id);
?>