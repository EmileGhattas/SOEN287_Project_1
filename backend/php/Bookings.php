<?php

require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(["error" => "No data received"]);
    exit;
}

$type = isset($data['type']) ? $data['type'] : null;
$userId = isset($data['userId']) ? (int)$data['userId'] : 0;
$date = isset($data['date']) ? $data['date'] : null;

if (!$type || !$userId || !$date) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(["error" => "Missing required fields"]);
    exit;
}

$conn = get_connection();
$conn->begin_transaction();

try {
    // Insert into bookings table
    $stmt = $conn->prepare("
        INSERT INTO bookings (user_id, booking_type, booking_date)
        VALUES (?, ?, ?)
    ");
    $stmt->bind_param("iss", $userId, $type, $date);

    if (!$stmt->execute()) {
        throw new Exception("Error creating booking: " . $stmt->error);
    }

    $bookingId = $stmt->insert_id;
    $stmt->close();

    if ($type === 'lab') {
        $labId = isset($data['labId']) ? (int)$data['labId'] : 0;
        $slot = isset($data['slot']) ? $data['slot'] : null;

        if (!$labId || !$slot) {
            throw new Exception("Missing labId or slot");
        }

        $stmt = $conn->prepare("
            INSERT INTO lab_bookings (booking_id, lab_id, time_slot)
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param("iis", $bookingId, $labId, $slot);

        if (!$stmt->execute()) {
            throw new Exception("Error creating lab booking: " . $stmt->error);
        }
        $stmt->close();

    } elseif ($type === 'equipment') {
        $equipmentId = isset($data['equipmentId']) ? (int)$data['equipmentId'] : 0;
        $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 1;

        if (!$equipmentId) {
            throw new Exception("Missing equipmentId");
        }

        $stmt = $conn->prepare("
            INSERT INTO equipment_bookings (booking_id, equipment_id, quantity)
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param("iii", $bookingId, $equipmentId, $quantity);

        if (!$stmt->execute()) {
            throw new Exception("Error creating equipment booking: " . $stmt->error);
        }
        $stmt->close();
    } else {
        throw new Exception("Unsupported booking type: " . $type);
    }

    $conn->commit();
    $conn->close();

    header('Content-Type: application/json');
    echo json_encode([
        "success" => true,
        "bookingId" => $bookingId,
        "type" => $type
    ]);
} catch (Exception $e) {
    $conn->rollback();
    $conn->close();
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(["error" => $e->getMessage()]);
}
