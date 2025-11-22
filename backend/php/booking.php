<?php

global $pdo;
require_once 'database.php';

$data = json_decode(file_get_contents("php://input"), true);


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

$conn = get_connection();

$stmt = $conn->prepare("SELECT user_id FROM users WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
if (!$result->fetch_assoc()) {
    $stmt->close();
    $conn->close();
    http_response_code(400);
    exit("User not found.");
}
$stmt->close();

// --- VALIDATE ROOM ---
$stmt = $conn->prepare("SELECT room_id FROM rooms WHERE name = ?");
$stmt->bind_param("s", $roomName);
$stmt->execute();
$result = $stmt->get_result();
$room = $result->fetch_assoc();
$stmt->close();

if (!$room) {
    $conn->close();
    http_response_code(400);
    exit("Room not found.");
}

$roomId = (int)$room['room_id'];

if (strlen($start) == 5) $start .= ':00';
if (strlen($end) == 5)   $end   .= ':00';

$conn->begin_transaction();

try {
    $stmt = $conn->prepare("
        INSERT INTO bookings (user_id, booking_type, booking_date)
        VALUES (?, 'room', ?)
    ");
    $stmt->bind_param("is", $userId, $date);

    if (!$stmt->execute()) {
        throw new Exception("Error creating booking: " . $stmt->error);
    }

    $bookingId = $stmt->insert_id;
    $stmt->close();

    $stmt = $conn->prepare("
        INSERT INTO room_bookings (booking_id, room_id, start_time, end_time)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->bind_param("iiss", $bookingId, $roomId, $start, $end);

    if (!$stmt->execute()) {
        throw new Exception("Error creating room booking: " . $stmt->error);
    }

    $stmt->close();

    $conn->commit();
    $conn->close();

    echo "Room booking saved.";

} catch (Exception $e) {
    $conn->rollback();
    $conn->close();

    http_response_code(400);
    exit("Error saving booking: " . $e->getMessage());
}