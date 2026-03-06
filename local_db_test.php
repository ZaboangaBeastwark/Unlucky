<?php
$host = 'mysql.rpgbearhouse.app.br';
$db = 'rpgbearhouse';
$user = 'rpgbearhouse';
$pass = '368561rpG';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $stmt = $pdo->query("SELECT id, name, gm_id FROM sessions");
    $sessions = $stmt->fetchAll();

    $stmt2 = $pdo->query("SELECT id, username FROM users WHERE role = 'gm'");
    $gms = $stmt2->fetchAll();

    echo "SESSIONS:\n";
    print_r($sessions);
    echo "\nGMS:\n";
    print_r($gms);

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
