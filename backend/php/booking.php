<?php
// Legacy entry point kept for room reservations; delegates to the unified handler in bookings.php.

require_once 'bookings.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ["error" => "Method not allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    respond(400, ["error" => "No data received."]);
    exit;
}

// Default to a room booking if the client omitted the type
if (!isset($data['type'])) {
    $data['type'] = 'room';
}

handle_booking($data);
?>
