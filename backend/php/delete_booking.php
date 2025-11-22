<?php

require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

header('Content-Type: application/json');

if (isset($data['userId'])) {
    $userId = (int)$data['userId'];
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid user id"]);
        exit;
    }

    $conn = get_connection();
    $stmt = $conn->prepare("DELETE FROM bookings WHERE user_id = ?");
    $stmt->bind_param("i", $userId);

    if ($stmt->execute()) {
        $deleted = $stmt->affected_rows;
        echo json_encode([
            "success" => true,
            "deleted" => $deleted
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            "error" => "Error deleting bookings: " . $stmt->error
        ]);
    }

    $stmt->close();
    $conn->close();
    exit;
}

// optional: keep a fallback for deleting by booking id if needed later
if (isset($data['bookingId'])) {
    $bookingId = (int)$data['bookingId'];
    if ($bookingId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid booking id"]);
        exit;
    }
    $conn = get_connection();
    $stmt = $conn->prepare("DELETE FROM bookings WHERE booking_id = ?");
    $stmt->bind_param("i", $bookingId);
    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "deleted" => $stmt->affected_rows
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Error deleting booking: " . $stmt->error]);
    }
    $stmt->close();
    $conn->close();
    exit;
}

http_response_code(400);
echo json_encode(["error" => "No userId or bookingId provided"]);
