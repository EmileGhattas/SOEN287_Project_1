<?php

global $pdo;
require_once 'database.php';

$data = json_decode(file_get_contents("php://input"));


if (!$data) {
    http_response_code(400);
    exit("No data received.");
}

$userId   = isset($data['userId']) ? $data['userId'] : null;
$roomName = isset($data['room']) ? $data['room'] : null;
$date     = isset($data['date']) ? $data['date'] : null;
$start    = isset($data['startTime']) ? $data['startTime'] : null;
$end      = isset($data['endTime']) ? $data['endTime'] : null;

if (!$userId || !$roomName || !$date || !$start || !$end) {
    http_response_code(400);
    exit("Missing required fields.");
}

$checkUser = $pdo->prepare("SELECT user_id FROM users WHERE user_id = ?");
$checkUser->execute([$userId]);
if (!$checkUser->fetch()) {
    http_response_code(400);
    exit("User not found.");
}

$checkRoom = $pdo->prepare("SELECT room_id FROM rooms WHERE name = ?");
$checkRoom->execute([$roomName]);
$room = $checkRoom->fetch(PDO::FETCH_ASSOC);
if (!$room) {
    http_response_code(400);
    exit("Room not found.");
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO room_bookings (user_id, room_id, booking_date, start_time, end_time)
        VALUES (?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $userId,
        $room['room_id'],
        $date,
        $start . ':00',
        $end   . ':00'
    ]);

    echo "Room booking saved ";

} catch (PDOException $e) {
    http_response_code(400);
    exit("Error saving booking: " . $e->getMessage());
}