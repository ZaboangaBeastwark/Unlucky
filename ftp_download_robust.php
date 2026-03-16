<?php
/**
 * ftp_download_robust.php  
 * Downloads all files from FTP recursively using fallback for servers without MLSD.
 */

$ftp_server = "ftp.web15f84.uni5.net";
$ftp_user = "rpgbearhouse";
$ftp_pass = "368561@rpG";

$local_root = realpath(__DIR__ . '/../Unlucky-Local');
if (!$local_root) {
    mkdir(__DIR__ . '/../Unlucky-Local', 0777, true);
    $local_root = realpath(__DIR__ . '/../Unlucky-Local');
}

echo "Connecting...\n";
$conn = ftp_connect($ftp_server, 21, 30) or die("Cannot connect.\n");
ftp_login($conn, $ftp_user, $ftp_pass) or die("Login failed.\n");
ftp_pasv($conn, true);

echo "Connected! Downloading to: $local_root\n\n";

$skip = ['.', '..', '.git'];
$ok = 0;
$fail = 0;

function isDir($conn, $path)
{
    $current = ftp_pwd($conn);
    $result = @ftp_chdir($conn, $path);
    if ($result) {
        ftp_chdir($conn, $current);
        return true;
    }
    return false;
}

function downloadRecursive($conn, $remote_dir, $local_dir, &$ok, &$fail, $skip)
{
    if (!is_dir($local_dir)) {
        mkdir($local_dir, 0777, true);
    }

    // Try MLSD first, fall back to NLIST
    $entries = null;
    try {
        $entries = @ftp_mlsd($conn, $remote_dir);
    } catch (Exception $e) {
    }

    if ($entries === false || $entries === null) {
        // Fallback: use nlist + check if each entry is directory
        $items = ftp_nlist($conn, $remote_dir);
        if ($items === false)
            return;

        $entries = [];
        foreach ($items as $item) {
            $name = basename($item);
            $type = isDir($conn, $remote_dir . '/' . $name) ? 'dir' : 'file';
            $entries[] = ['name' => $name, 'type' => $type];
        }
    }

    foreach ($entries as $entry) {
        $name = $entry['name'];
        if (in_array($name, $skip))
            continue;

        $remote_path = rtrim($remote_dir, '/') . '/' . $name;
        $local_path = rtrim($local_dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $name;
        $type = $entry['type'] ?? 'file';

        if ($type === 'dir') {
            echo "  DIR: $remote_path\n";
            downloadRecursive($conn, $remote_path, $local_path, $ok, $fail, $skip);
        } else {
            if (ftp_get($conn, $local_path, $remote_path, FTP_BINARY)) {
                $size = round(filesize($local_path) / 1024, 1);
                echo "  OK ({$size}KB): $remote_path\n";
                $ok++;
            } else {
                echo "  ERR: $remote_path\n";
                $fail++;
            }
        }
    }
}

downloadRecursive($conn, '.', $local_root, $ok, $fail, $skip);
ftp_close($conn);
echo "\nDone! OK: $ok  Failed: $fail\n";
?>