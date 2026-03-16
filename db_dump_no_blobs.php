<?php
/**
 * db_dump_no_blobs.php
 * Dumps all tables from remote DB, but strips BLOB/IMAGE columns from token/avatar fields.
 * This keeps the dump small enough to import locally without max_allowed_packet issues.
 */

$host = 'mysql.rpgbearhouse.app.br';
$dbname = 'rpgbearhouse';
$user = 'rpgbearhouse';
$pass = 'DaggerHeartDB2026';

$out_dir = realpath(__DIR__ . '/../Unlucky-Local') . '/database';
if (!is_dir($out_dir))
    mkdir($out_dir, 0777, true);
$out_file = $out_dir . '/dump_no_blobs.sql';

echo "Connecting to remote DB...\n";
$pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
echo "Tables: " . implode(', ', $tables) . "\n\n";

// Columns to skip (big BLOBs)
$skipCols = ['avatar', 'token', 'background'];

$sql = "-- Unlucky DB Dump (No BLOBs)\n-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
$sql .= "CREATE DATABASE IF NOT EXISTS `unlucky_local` DEFAULT CHARACTER SET utf8mb4;\n";
$sql .= "USE `unlucky_local`;\n\n";
$sql .= "SET foreign_key_checks = 0;\n\n";

foreach ($tables as $table) {
    echo "Dumping: $table...";

    $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
    $sql .= "DROP TABLE IF EXISTS `$table`;\n";
    $sql .= $create['Create Table'] . ";\n\n";

    // Get column info
    $colsResult = $pdo->query("SHOW COLUMNS FROM `$table`");
    $allCols = $colsResult->fetchAll(PDO::FETCH_COLUMN);

    // Filter out huge blob columns
    $cols = array_filter($allCols, function ($col) use ($skipCols) {
        return !in_array($col, $skipCols);
    });

    $colSel = implode(', ', array_map(fn($c) => "`$c`", $cols));
    $rows = $pdo->query("SELECT $colSel FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);

    if (count($rows) > 0) {
        $colList = '`' . implode('`, `', array_keys($rows[0])) . '`';
        foreach ($rows as $row) {
            $vals = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $row);
            $sql .= "INSERT INTO `$table` ($colList) VALUES (" . implode(', ', $vals) . ");\n";
        }
        $sql .= "\n";
    }

    echo count($rows) . " rows\n";
}

$sql .= "SET foreign_key_checks = 1;\n";
file_put_contents($out_file, $sql);
$kb = round(filesize($out_file) / 1024, 1);
echo "\nSaved to: $out_file ($kb KB)\n";
?>