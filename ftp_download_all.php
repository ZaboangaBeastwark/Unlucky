<?php
/**
 * ftp_download_all.php
 * Downloads ALL files recursively from the remote FTP server into the Unlucky-Local folder.
 * Run this from the Protótipo DaggerHeart directory:
 *   php ftp_download_all.php
 */

$ftp_server = "ftp.web15f84.uni5.net";
$ftp_user = "rpgbearhouse";
$ftp_pass = "368561@rpG";

$local_root = realpath(__DIR__ . '/../Unlucky-Local');

if (!$local_root) {
    mkdir(__DIR__ . '/../Unlucky-Local', 0777, true);
    $local_root = realpath(__DIR__ . '/../Unlucky-Local');
}

echo "Connecting to FTP...\n";
$conn = ftp_connect($ftp_server) or die("Cannot connect.\n");
ftp_login($conn, $ftp_user, $ftp_pass) or die("Login failed.\n");
ftp_pasv($conn, true);

echo "Connected! Downloading to: $local_root\n\n";

$skip = ['.', '..', '.git', 'node_modules'];

function downloadDir($conn, $remote_dir, $local_dir, $skip)
{
    if (!is_dir($local_dir))
        mkdir($local_dir, 0777, true);

    $list = ftp_mlsd($conn, $remote_dir);
    if (!$list) {
        // fallback for servers without MLSD
        $list = [];
        $raw = ftp_nlist($conn, $remote_dir);
        foreach ($raw as $item) {
            $list[] = ['name' => basename($item), 'type' => 'unknown'];
        }
    }

    foreach ($list as $entry) {
        $name = $entry['name'];
        if (in_array($name, $skip))
            continue;

        $remote_path = rtrim($remote_dir, '/') . '/' . $name;
        $local_path = rtrim($local_dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $name;
        $type = $entry['type'] ?? 'unknown';

        if ($type === 'dir') {
            echo "  DIR: $remote_path\n";
            downloadDir($conn, $remote_path, $local_path, $skip);
        } else {
            // Try to get the file (assume file if type is unknown)
            $result = ftp_get($conn, $local_path, $remote_path, FTP_BINARY);
            echo ($result ? "  OK:  " : "  ERR: ") . $remote_path . "\n";
        }
    }
}

downloadDir($conn, '.', $local_root, $skip);

ftp_close($conn);
echo "\nDownload complete!\n";
?>