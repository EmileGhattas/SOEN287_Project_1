<?php

require_once __DIR__ . '/../database.php';

$pdo = get_connection();

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    exit("No data received.");
}

/*create a lab*/
$action = isset($data['action']) ? $data['action'] : null;

if($action === "create"){

    if(empty($data['name'])){
        echo json_encode(["error"=> "lab name is required"]);
        exit;
    }


    $name = $data['name'];

    try {
        $stmt = $pdo->prepare("INSERT INTO labs (name) VALUES (?)");
        $stmt->execute([$name]);


        echo json_encode(["success" => true, "message" => "Lab created"]);
    } catch (PDOException $e) {

        echo json_encode(["error" => "Error creating room: " . $e->getMessage()]);
    }

    exit;
}


/*update lab */

if($action === "edit"){

    if(empty($data['name'])){
        echo json_encode(["error"=> "lab name is required"]);
        exit;
    }



    $id = intval($data['lab_id']);

     $name = $data['name'];



    try {
        $stmt = $pdo->prepare("UPDATE labs SET name=? WHERE lab_id=?");
        $stmt->execute([$name, $id]);


        echo json_encode(["success" => true, "message" => "Lab updated"]);
    } catch (PDOException $e) {
        echo json_encode(["error" => "Error updating lab: " . $e->getMessage()]);

    }

    exit;



}


/*delete lab*/

if ($action === "delete") {


    if (empty($data['lab_id'])) {
        echo json_encode(["error" => "lab ID is required"]);
        exit;

    }

    $id = intval($data['lab_id']);

    try {


        $stmt = $pdo->prepare("DELETE FROM labs WHERE lab_id=?");
        $stmt->execute([$id]);

        echo json_encode(["success" => true, "message" => "Lab deleted"]);
    } catch (PDOException $e) {

        echo json_encode(["error" => "Error deleting lab: " . $e->getMessage()]);
    }

    exit;
}

echo json_encode(["error" => "Unknown action"]);

?>
