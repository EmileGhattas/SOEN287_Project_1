<?php

require_once "database.php";

$data = json_decode(file_get_contents("php://input"), true);


if (!$data) {
    http_response_code(400);
    exit("No data received.");
}



/*create equipment*/





$action = isset($data['action']) ? $data['action'] : null;





if($action === "create"){

    if(empty($data['name'])){
        echo json_encode(["error"=> "equipment name is required"]);
        exit;
    }


    $name = $data['name'];

    $quantity = isset($data['total_quantity']) ? intval($data['total_quantity']) : 0;



    try {
        $stmt = $pdo->prepare("INSERT INTO equipment (name, total_quantity, available_quantity) VALUES (?,?,?)");
        $stmt->execute([$name, $quantity, $quantity]);



        echo json_encode(["success" => true, "message" => "Equipment created"]);
    } catch (PDOException $e) {

        echo json_encode(["error" => "Error creating equipment: " . $e->getMessage()]);
    }

    exit;
}



/* update equipment */



$action = isset($data['action']) ? $data['action'] : null;


if ($action === "edit") {

    if (empty($data['equipment_id']) || empty($data['name'])) {
        echo json_encode(["error" => "Equipment ID and name are required"]);
        exit;
    }

    $id = intval($data['equipment_id']);
    $name = $data['name'];

    try {

        $stmt = $pdo->prepare("
            UPDATE equipment 
            SET name = ?
            WHERE equipment_id = ?
        ");

        $stmt->execute([$name, $id]);

        echo json_encode(["success" => true, "message" => "Equipment updated"]);

    } catch (PDOException $e) {
        echo json_encode(["error" => "Error updating equipment: " . $e->getMessage()]);
    }

    exit;
}


/*delete*/



if ($action === "delete") {

    if (empty($data['equipment_id'])) {
        
        echo json_encode(["error" => "Equipment ID is required"]);
        exit;
    }

    $id = intval($data['equipment_id']);

    try {

        $stmt = $pdo->prepare("DELETE FROM equipment WHERE equipment_id=?");
        $stmt->execute([$id]);

        echo json_encode(["success" => true, "message" => "Equipment deleted"]);

    } catch (PDOException $e) {

        echo json_encode(["error" => "Error deleting equipment: " . $e->getMessage()]);
    }

    exit;
}

echo json_encode(["error" => "Unknown action"]);
