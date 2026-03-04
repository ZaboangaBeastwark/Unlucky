<?php
require_once __DIR__ . '/../api/db.php';

$sql = file_get_contents(__DIR__ . '/seed_canonical_bestiary.sql');

try {
    $pdo->exec($sql);
    echo "Sucesso: Bestiário povoado com as 10 fichas canônicas iniciais!";
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        echo "Aviso: Parecem já existir fichas cadastradas. Ignorando para não duplicar.";
    } else {
        echo "Erro: " . $e->getMessage();
    }
}
?>