<?php

require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit("Method not allowed");
}

$bookingId = isset($_POST['booking_id']) ? (int)$_POST['booking_id'] : 0;

if ($bookingId <= 0) {
    http_response_code(400);
    exit("Invalid booking id.");
}

$conn = get_connection();

$stmt = $conn->prepare("DELETE FROM bookings WHERE booking_id = ?");
$stmt->bind_param("i", $bookingId);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo "Booking deleted.";
    } else {
        echo "No booking found.";
    }
} else {
    echo "Error deleting booking: " . $stmt->error;
}

$stmt->close();
$conn->close();
