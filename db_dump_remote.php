<?php
/**
 * db_dump_remote.php
 * Dumps all tables from the remote MySQL database as INSERT statements.
 * Run this from the Protótipo DaggerHeart directory:
 *   php db_dump_remote.php
 * Output file: Unlucky-Local/database/dump.sql
 */

// Remote DB credentials
$host = 'mysql.rpgbearhouse.app.br';
$dbname = 'rpgbearhouse';
$user = 'rpgbearhouse';
$pass = 'DaggerHeartDB2026';
$charset = 'utf8mb4';

$out_dir = realpath(__DIR__ . '/../Unlucky-Local') . '/database';
if (!is_dir($out_dir))
    mkdir($out_dir, 0777, true);
$out_file = $out_dir . '/dump.sql';

echo "Connecting to remote DB...\n";
$pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=$charset", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
echo "Found " . count($tables) . " tables: " . implode(', ', $tables) . "\n\n";

$sql = "-- Unlucky DB Dump\n-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
$sql .= "CREATE DATABASE IF NOT EXISTS `unlucky_local` DEFAULT CHARACTER SET utf8mb4;\n";
$sql .= "USE `unlucky_local`;\n\n";
$sql .= "SET foreign_key_checks = 0;\n\n";

foreach ($tables as $table) {
    echo "Dumping table: $table...";

    // Get CREATE TABLE statement
    $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
    $sql .= "DROP TABLE IF EXISTS `$table`;\n";
    $sql .= $create['Create Table'] . ";\n\n";

    // Get all rows
    $rows = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) > 0) {
        $cols = array_keys($rows[0]);
        $colList = '`' . implode('`, `', $cols) . '`';

        foreach ($rows as $row) {
            $vals = array_map(function ($v) use ($pdo) {
                if ($v === null)
                    return 'NULL';
                return $pdo->quote($v);
            }, $row);
            $sql .= "INSERT INTO `$table` ($colList) VALUES (" . implode(', ', $vals) . ");\n";
        }
        $sql .= "\n";
    }

    echo " " . count($rows) . " rows\n";
}

$sql .= "SET foreign_key_checks = 1;\n";
file_put_contents($out_file, $sql);
echo "\nDump saved to: $out_file\n";
echo "File size: " . round(filesize($out_file) / 1024, 1) . " KB\n";
?>