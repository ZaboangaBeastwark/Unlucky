<?php
require_once __DIR__ . '/api/session.php';
require_once 'api/db.php';

// Force Zaboanga login
$stmt = $pdo->prepare('SELECT id, username, role FROM users WHERE username = ?');
$stmt->execute(['Zaboanga']);
$user = $stmt->fetch();

if ($user) {
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['last_activity'] = time();

    echo "<h1>Login Forçado com Sucesso!</h1>";
    echo "<p>Usuário: " . $_SESSION['username'] . " (ID: " . $_SESSION['user_id'] . ")</p>";
    echo "<p>Role: " . $_SESSION['role'] . "</p>";
    echo "<p><a href='index.html'>Ir para o Painel do Mestre</a></p>";

    // Check if session exists in DB
    $stmtS = $pdo->prepare('SELECT id, name FROM sessions WHERE gm_id = ? ORDER BY id DESC LIMIT 1');
    $stmtS->execute([$user['id']]);
    $session = $stmtS->fetch();

    if ($session) {
        echo "<p>Sessão ativa encontrada no banco: <b>" . $session['name'] . "</b> (ID: " . $session['id'] . ")</p>";
    } else {
        echo "<p style='color:red'>AVISO: Nenhuma sessão encontrada no banco para este ID!</p>";
    }
} else {
    echo "<h1 style='color:red'>Erro: Usuário Zaboanga não encontrado!</h1>";
}
?>