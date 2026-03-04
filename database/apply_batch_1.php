<?php
require_once __DIR__ . '/../api/db.php';

$sql1 = file_get_contents(__DIR__ . '/bestiary_batch_1.sql');
$sql2 = file_get_contents(__DIR__ . '/bestiary_batch_1_part2.sql');

try {
    $pdo->exec($sql1);
    $pdo->exec($sql2);
    echo "Sucesso: Oponentes da Leva 1 cadastrados no Bestiário!";
} catch (PDOException $e) {
    echo "Erro ao cadastrar: " . $e->getMessage();
}
?>