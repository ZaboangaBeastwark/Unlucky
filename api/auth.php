<?php
// api/auth.php
require_once __DIR__ . '/session.php';
require_once 'db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if ($action === 'register') {
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'player'; // 'player' or 'gm'

        if (empty($username) || empty($password)) {
            jsonResponse(['error' => 'Username and password are required'], 400);
        }

        if (!in_array($role, ['player', 'gm'])) {
            $role = 'player';
        }

        // Check if user exists
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Username already exists'], 400);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        if ($stmt->execute([$username, $hash, $role])) {
            $userId = $pdo->lastInsertId();
            $_SESSION['user_id'] = $userId;
            $_SESSION['role'] = $role;
            $_SESSION['username'] = $username;
            jsonResponse(['message' => 'Registration successful', 'user' => ['id' => $userId, 'username' => $username, 'role' => $role]]);
        } else {
            jsonResponse(['error' => 'Failed to register user'], 500);
        }
    } elseif ($action === 'login') {
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            jsonResponse(['error' => 'Username and password are required'], 400);
        }

        $stmt = $pdo->prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['username'] = $user['username'];
            jsonResponse(['message' => 'Login successful', 'user' => ['id' => $user['id'], 'username' => $user['username'], 'role' => $user['role']]]);
        } else {
            jsonResponse(['error' => 'Invalid credentials'], 401);
        }
    } elseif ($action === 'logout') {
        session_destroy();
        jsonResponse(['message' => 'Logout successful']);
    }
} elseif ($method === 'GET') {
    if ($action === 'me') {
        if (isset($_SESSION['user_id'])) {
            jsonResponse([
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'role' => $_SESSION['role']
                ]
            ]);
        } else {
            jsonResponse(['error' => 'Not authenticated'], 401);
        }
    }
}

jsonResponse(['error' => 'Invalid action'], 400);
