<?php

global $pdo;
require_once 'database.php';

$data = json_decode(file_get_contents('php://input'), true);

if(!$data){
    http_response_code(400);
    exit("No booking received");
}

$user_id = isset($data['user_id']) ? $data['user_id'] : null;
$room_id = isset($data['room_id']) ? $data['room_id'] : null;
$date = isset($data['date']) ? $data['date'] : null;
$Stime = isset($data['startTime']) ? $data['startTime'] : null;
$Etime = isset($data['endTime']) ? $data['endTime'] : null;

if (!$user_id || !$room_id || !$date || !$Stime || !$Etime) {
    http_response_code(400);
    exit("Missing booking fields.");
}

$checkUser = $pdo->prepare("SELECT user_id FROM users WHERE user_id = ?");
$checkUser->execute([$user_id]);

if (!$checkUser->fetch()) {
    http_response_code(400);
    exit("User not found.");
}