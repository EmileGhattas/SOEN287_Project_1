<?php
// Unified booking endpoint for rooms, labs, and equipment.
// Uses PDO connections defined in database.php and returns JSON responses for front-end fetch calls.

require_once 'database.php';

header('Content-Type: application/json');

/**
 * Emit a JSON response with the given status code.
 */
function respond(int $status, array $payload)
{
    http_response_code($status);
    echo json_encode($payload);
}

/**
 * Centralized booking handler to be reused by other scripts (e.g., room_booking wrapper).
 */
function handle_booking(array $data): void
{
    $type   = $data['type'] ?? null;
    $userId = isset($data['userId']) ? (int)$data['userId'] : 0;
    $date   = $data['date'] ?? null;

    if (!$type || !$userId || !$date) {
        respond(400, ["error" => "Missing required fields: type, userId, and date are required."]);
        return;
    }

    try {
        $pdo = get_connection();

        // Validate user exists
        $userStmt = $pdo->prepare("SELECT user_id FROM users WHERE user_id = ?");
        $userStmt->execute([$userId]);
        if (!$userStmt->fetch()) {
            respond(404, ["error" => "User not found."]);
            return;
        }

        $pdo->beginTransaction();

        $insertBooking = $pdo->prepare(
            "INSERT INTO bookings (user_id, booking_type, booking_date) VALUES (?, ?, ?)"
        );
        $insertBooking->execute([$userId, $type, $date]);
        $bookingId = (int)$pdo->lastInsertId();

        if ($type === 'lab') {
            $labId = isset($data['labId']) ? (int)$data['labId'] : 0;
            $slot  = $data['slot'] ?? null;

            if (!$labId || !$slot) {
                $pdo->rollBack();
                respond(400, ["error" => "Lab bookings require labId and slot."]);
                return;
            }

            // Ensure lab exists
            $labStmt = $pdo->prepare("SELECT lab_id FROM labs WHERE lab_id = ?");
            $labStmt->execute([$labId]);
            if (!$labStmt->fetch()) {
                $pdo->rollBack();
                respond(404, ["error" => "Lab not found."]);
                return;
            }

            // Check for conflicts on the same date and slot
            $conflict = $pdo->prepare(
                "SELECT lb.id FROM lab_bookings lb\n                 JOIN bookings b ON b.booking_id = lb.booking_id\n                 WHERE lb.lab_id = ? AND lb.time_slot = ? AND b.booking_date = ? LIMIT 1"
            );
            $conflict->execute([$labId, $slot, $date]);
            if ($conflict->fetch()) {
                $pdo->rollBack();
                respond(409, ["error" => "This lab slot is already booked for the selected date."]);
                return;
            }

            $labBooking = $pdo->prepare(
                "INSERT INTO lab_bookings (booking_id, lab_id, time_slot) VALUES (?, ?, ?)"
            );
            $labBooking->execute([$bookingId, $labId, $slot]);
        } elseif ($type === 'equipment') {
            $equipmentId = isset($data['equipmentId']) ? (int)$data['equipmentId'] : 0;
            $quantity    = isset($data['quantity']) ? max(1, (int)$data['quantity']) : 1;

            if (!$equipmentId) {
                $pdo->rollBack();
                respond(400, ["error" => "Equipment bookings require equipmentId."]);
                return;
            }

            // Check availability and reserve quantity atomically
            $eqStmt = $pdo->prepare("SELECT available_quantity FROM equipment WHERE equipment_id = ? FOR UPDATE");
            $eqStmt->execute([$equipmentId]);
            $equipment = $eqStmt->fetch();
            if (!$equipment) {
                $pdo->rollBack();
                respond(404, ["error" => "Equipment not found."]);
                return;
            }

            if ($equipment['available_quantity'] < $quantity) {
                $pdo->rollBack();
                respond(409, ["error" => "Not enough equipment available for the requested quantity."]);
                return;
            }

            $eqBooking = $pdo->prepare(
                "INSERT INTO equipment_bookings (booking_id, equipment_id, quantity) VALUES (?, ?, ?)"
            );
            $eqBooking->execute([$bookingId, $equipmentId, $quantity]);

            $updateQty = $pdo->prepare(
                "UPDATE equipment SET available_quantity = available_quantity - ? WHERE equipment_id = ?"
            );
            $updateQty->execute([$quantity, $equipmentId]);
        } elseif ($type === 'room') {
            $roomId    = isset($data['roomId']) ? (int)$data['roomId'] : 0;
            $startTime = $data['startTime'] ?? null;
            $endTime   = $data['endTime'] ?? null;

            if (!$roomId || !$startTime || !$endTime) {
                $pdo->rollBack();
                respond(400, ["error" => "Room bookings require roomId, startTime, and endTime."]);
                return;
            }

            // Normalize HH:MM values
            if (strlen($startTime) === 5) {
                $startTime .= ':00';
            }
            if (strlen($endTime) === 5) {
                $endTime .= ':00';
            }

            if ($startTime >= $endTime) {
                $pdo->rollBack();
                respond(400, ["error" => "End time must be after start time."]);
                return;
            }

            $roomStmt = $pdo->prepare("SELECT room_id FROM rooms WHERE room_id = ?");
            $roomStmt->execute([$roomId]);
            if (!$roomStmt->fetch()) {
                $pdo->rollBack();
                respond(404, ["error" => "Room not found."]);
                return;
            }

            // Prevent overlapping bookings for the same date
            $conflict = $pdo->prepare(
                "SELECT rb.rm_booking_id FROM room_bookings rb\n                 JOIN bookings b ON b.booking_id = rb.booking_id\n                 WHERE rb.room_id = ? AND b.booking_date = ?\n                   AND NOT (rb.end_time <= ? OR rb.start_time >= ?)\n                 LIMIT 1"
            );
            $conflict->execute([$roomId, $date, $startTime, $endTime]);
            if ($conflict->fetch()) {
                $pdo->rollBack();
                respond(409, ["error" => "This room is already booked for the selected time range."]);
                return;
            }

            $roomBooking = $pdo->prepare(
                "INSERT INTO room_bookings (booking_id, room_id, start_time, end_time) VALUES (?, ?, ?, ?)"
            );
            $roomBooking->execute([$bookingId, $roomId, $startTime, $endTime]);
        } else {
            $pdo->rollBack();
            respond(400, ["error" => "Unsupported booking type."]);
            return;
        }

        $pdo->commit();
        respond(200, ["success" => true, "bookingId" => $bookingId, "type" => $type]);
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        respond(500, ["error" => "Error creating booking: " . $e->getMessage()]);
    }
}

// Handle direct HTTP invocation
if (php_sapi_name() !== 'cli' && realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'])) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, ["error" => "Method not allowed"]);
        exit;
    }

    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) {
        respond(400, ["error" => "No data received"]);
        exit;
    }

    handle_booking($data);
}
?>
