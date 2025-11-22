<?php

require_once 'database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "No data received"]);
    exit;
}

try {
    $pdo = get_connection();

    if (isset($data['userId'])) {
        $userId = (int)$data['userId'];
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid user id"]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM bookings WHERE user_id = ?");
        $stmt->execute([$userId]);

        echo json_encode([
            "success" => true,
            "deleted" => $stmt->rowCount(),
        ]);
        exit;
    }

    if (isset($data['bookingId'])) {
        $bookingId = (int)$data['bookingId'];
        if ($bookingId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid booking id"]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM bookings WHERE booking_id = ?");
        $stmt->execute([$bookingId]);

        echo json_encode([
            "success" => true,
            "deleted" => $stmt->rowCount(),
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(["error" => "No userId or bookingId provided"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error deleting booking: " . $e->getMessage()]);
}
