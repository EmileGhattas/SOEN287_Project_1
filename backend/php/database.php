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
"SELECT user_id, username, password, is_admin FROM users WHERE username = ?");

    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    $conn->close();

    return $user;
}

//This is for regular user not admin
function create_user($username, $password, $email){
    $conn = get_connection();

    $stmt = $conn->prepare(
        "INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, FALSE)");

    $stmt->bind_param("ssi", $username, $password, $email);

    $ok = $stmt->execute();

    $stmt->close();
    $conn->close();
    return $ok;
}

function create_lab_booking($user_id, $lab_id, $booking_date, $time_slot, &$errorMsg) {
    $conn = get_connection();


}


