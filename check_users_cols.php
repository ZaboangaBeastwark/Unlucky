<?php
require_once 'api/db.php';
\ = \->query("SHOW COLUMNS FROM users");
print_r(\->fetchAll(PDO::FETCH_ASSOC));
