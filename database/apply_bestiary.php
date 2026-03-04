<?php
require_once __DIR__ . '/../api/db.php';

$sql = file_get_contents(__DIR__ . '/patch_bestiary_schema.sql');

try {
    $pdo->exec($sql);
    echo "Sucesso: Tabelas do Bestiário criadas e base atualizada!";
} catch (PDOException $e) {
    echo "Erro: " . $e->getMessage();
}
?>