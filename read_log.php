<?php
if (file_exists('uploads/gm_debug.log')) {
    echo file_get_contents('uploads/gm_debug.log');
} else {
    echo "Log not found.";
}
