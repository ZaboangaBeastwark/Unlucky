<?php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$conn_id = ftp_connect($ftp_server) or die("Couldn't connect to $ftp_server");
if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    ftp_pasv($conn_id, true);

    function list_recursive($conn_id, $path)
    {
        $files = ftp_nlist($conn_id, $path);
        if (!$files)
            return;
        foreach ($files as $file) {
            $base = basename($file);
            if ($base == "." || $base == "..")
                continue;
            echo $path . "/" . $base . "\n";
            // Check if it's a directory by trying to chdir
            if (@ftp_chdir($conn_id, $path . "/" . $base)) {
                ftp_cdup($conn_id);
                list_recursive($conn_id, $path . "/" . $base);
            }
        }
    }

    list_recursive($conn_id, ".");

} else {
    echo "Login failed\n";
}
ftp_close($conn_id);
