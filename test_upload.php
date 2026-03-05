<?php
// Cria um arquivo temporário de imagem (dummy)
$imgContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='); // red pixel
file_put_contents('test_dummy.png', $imgContent);

$_FILES = [
    'image' => [
        'name' => 'test_dummy.png',
        'type' => 'image/png',
        'tmp_name' => __DIR__ . '/test_dummy.png',
        'error' => 0,
        'size' => filesize('test_dummy.png')
    ]
];

$_POST = [
    'image_type' => 'avatar'
];

$_GET['action'] = 'upload_adversary_image';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SESSION = ['user_id' => 1, 'role' => 'gm']; // Simulate logged in user

// Hack function move_uploaded_file behavior since it only works with real HTTP POST
// We will rename instead inside a test script, but we can't easily mock move_uploaded_file inside gm.php.
// Instead, let's just use curl against the local server to upload a file!

?>