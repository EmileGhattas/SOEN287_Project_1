<?php

require_once __DIR__ . '/../database.php';

$pdo = get_connection();

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    exit("No data received.");
}

$action = isset($data['action']) ? $data['action'] : null;

/* create room*/
if ($action === "create") {
    if (empty($data['name'])) {
        echo json_encode(["error" => "room name is required"]);
        exit;
    }

    $name = $data['name'];
    $capacity = isset($data['capacity']) ? intval($data['capacity']) : null;

    try {
        $stmt = $pdo->prepare("INSERT INTO rooms (name, capacity) VALUES (?, ?)");
        $stmt->execute([$name, $capacity]);

        echo json_encode(["success" => true, "message" => "Room created"]);
    } catch (PDOException $e) {
        echo json_encode(["error" => "Error creating room: " . $e->getMessage()]);
    }

    exit;
}

/*edit room */
if ($action === "update") {
    if (empty($data['room_id']) || empty($data['name'])) {
        echo json_encode(["error" => "Room ID and name are required"]);
        exit;
    }

    $id = intval($data['room_id']);
    $name = $data['name'];
    $capacity = isset($data['capacity']) ? intval($data['capacity']) : null;

    try {
        $stmt = $pdo->prepare("UPDATE rooms SET name=?, capacity=? WHERE room_id=?");
        $stmt->execute([$name, $capacity, $id]);

        echo json_encode(["success" => true, "message" => "Room updated"]);
    } catch (PDOException $e) {
        echo json_encode(["error" => "Error updating room: " . $e->getMessage()]);
    }

    exit;
}

/*delete room */
if ($action === "delete") {
    if (empty($data['room_id'])) {
        echo json_encode(["error" => "Room ID is required"]);
        exit;
    }

    $id = intval($data['room_id']);

    try {
        $stmt = $pdo->prepare("DELETE FROM rooms WHERE room_id=?");
        $stmt->execute([$id]);

        echo json_encode(["success" => true, "message" => "Room deleted"]);
    } catch (PDOException $e) {
        echo json_encode(["error" => "Error deleting room: " . $e->getMessage()]);
    }

    exit;
}

echo json_encode(["error" => "Unknown action"]);
