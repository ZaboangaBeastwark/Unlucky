<?php
require_once 'api/db.php';
\ = \->query('SHOW COLUMNS FROM sessions');
print_r(\->fetchAll(PDO::FETCH_ASSOC));
