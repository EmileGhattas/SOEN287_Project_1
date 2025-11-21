<?php

$DB_HOST = 'localhost';
$DB_NAME = 'learnspace';
$DB_USER = 'roots';
$DB_PASSWORD = 'yourpassword';


function get_connection() {
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASSWORD;

    $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASSWORD, $DB_NAME);

    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");
    return $conn;
}


function get_user_username($username){
    $conn = get_connection();

    $stmt = $conn->prepare(
"SELECT user_id, users.username, password, is_admin FROM users WHERE username = ?");
}


