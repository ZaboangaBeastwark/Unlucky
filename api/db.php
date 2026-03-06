<?php
// api/db.php

$config = require __DIR__ . '/config.php';

$host = $config['host'];
$db = $config['db'];
$user = $config['user'];
$pass = $config['pass'];
$charset = $config['charset'];

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // In production, log the error rather than displaying it
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Function to send JSON response properly
function jsonResponse($data, $status = 200)
{
    header('Content-Type: application/json');

    // Add JSON_PARTIAL_OUTPUT_ON_ERROR to prevent complete failure
    $flags = 0;
    if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
        $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
    }
    if (defined('JSON_PARTIAL_OUTPUT_ON_ERROR')) {
        $flags |= JSON_PARTIAL_OUTPUT_ON_ERROR;
    }

    $json = json_encode($data, $flags);

    if ($json === false) {
        http_response_code(500);
        echo json_encode(['error' => 'JSON Encode Error: ' . json_last_error_msg()]);
        exit;
    }

    http_response_code($status);
    echo $json;
    exit;
}

// Global helper to log campaign actions natively across any API modifying state
function logAudit($pdo, $session_id, $character_id, $character_name, $action_type, $description)
{
    if (!isset($_SESSION['user_id']))
        return;

    try {
        $user_id = $_SESSION['user_id'];
        $actor_name = $_SESSION['username'] ?? 'Desconhecido';
        $user_role = $_SESSION['role'] ?? 'jogador';

        // Fallbacks if character values aren't provided straight away but we know the session
        $session_name = "Sessão $session_id";
        if ($session_id) {
            $stmt = $pdo->prepare('SELECT name FROM sessions WHERE id = ?');
            $stmt->execute([$session_id]);
            $sName = $stmt->fetchColumn();
            if ($sName)
                $session_name = $sName;
        }

        $stmt = $pdo->prepare('
            INSERT INTO audit_logs 
            (session_id, session_name, character_id, user_id, user_role, actor_name, character_name, action_type, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $session_id,
            $session_name,
            $character_id,
            $user_id,
            $user_role,
            $actor_name,
            $character_name,
            $action_type,
            $description
        ]);
    } catch (Exception $e) {
        // Silently log error to file but don't crash the main request
        error_log("Audit Log Failure: " . $e->getMessage());
    }
}
