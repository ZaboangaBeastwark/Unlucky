<?php
// deploy_latest.php
$ftp_server = 'ftp.web15f84.uni5.net';
$ftp_user = 'rpgbearhouse';
$ftp_pass = '368561@rpG';

$files_to_upload = [
    'index.html',
    'all_sessions.json',
    'db_dump.json',
    'audit.html',
    'api/db.php',
    'api/gm.php',
    'api/session.php',
    'api/auth.php',
    'api/character.php',
    'api/equipment.php',
    'api/audit.php',
    'js/app.js',
    'js/auth.js',
    'js/gm.js',
    'js/player.js',
    'js/dh_data.js',
    'js/audit.js',
    'css/style.css'
];

$conn_id = ftp_connect($ftp_server) or die("Couldn't connect to $ftp_server");

if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    echo "Connected as $ftp_user@$ftp_server\n";
    ftp_pasv($conn_id, true);

    $webroot = ""; // Default to root as files are already there

    foreach ($files_to_upload as $file) {
        $remote_file = $webroot . $file;
        $local_file = __DIR__ . '/' . $file;

        // Ensure secondary directories exist
        if (strpos($file, '/') !== false) {
            $parts = explode('/', $file);
            array_pop($parts); // remove filename
            $current_dir = $webroot;
            foreach ($parts as $part) {
                $current_dir .= $part;
                if (!@ftp_chdir($conn_id, $current_dir)) {
                    if (@ftp_mkdir($conn_id, $current_dir)) {
                        echo "Created directory: $current_dir\n";
                    }
                }
                $current_dir .= "/";
                @ftp_chdir($conn_id, "/"); // Return to root for simplified paths if needed, or maintain relative
            }
        }

        if (ftp_put($conn_id, $remote_file, $local_file, FTP_BINARY)) {
            echo "Successfully uploaded $file\n";
        } else {
            echo "There was a problem while uploading $file\n";
        }
    }

} else {
    echo "Couldn't connect as $ftp_user\n";
}

ftp_close($conn_id);
?>