<?php

$DB_HOST = getenv('DB_HOST') ?: 'localhost';
$DB_NAME = getenv('DB_NAME') ?: '287_d';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASSWORD = getenv('DB_PASSWORD') ?: '';

function get_connection() {
    static $pdo = null;
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASSWORD;

    if ($pdo === null) {
        $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        $pdo = new PDO($dsn, $DB_USER, $DB_PASSWORD, $options);
    }

    return $pdo;
}

function get_user_username($username){
    $pdo = get_connection();

    $stmt = $pdo->prepare("SELECT user_id, username, password, is_admin FROM users WHERE username = ?");
    $stmt->execute([$username]);

    return $stmt->fetch();
}

function find_user_by_id($userId) {
    $pdo = get_connection();
    $stmt = $pdo->prepare("SELECT user_id, username, email, is_admin FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);
    return $stmt->fetch();
}

// This is for regular user not admin
function create_user($username, $password, $email){
    $pdo = get_connection();

    $stmt = $pdo->prepare(
        "INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, FALSE)"
    );

    return $stmt->execute([$username, $password, $email]);
}

function create_booking($user_id, $booking_type, $booking_date, &$errorMessage){
    try {
        $pdo = get_connection();

        $stmt = $pdo->prepare("INSERT INTO bookings (user_id, booking_type, booking_date) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $booking_type, $booking_date]);

        return (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
        $errorMessage = "Database error while creating booking:" . $e->getMessage();
        return false;
    }
}

function ensure_admin_exists() {
    $pdo = get_connection();
    $stmt = $pdo->prepare("SELECT user_id, password FROM users WHERE username = 'admin' OR email = 'admin@learnspace.com' LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch();

    $hashedAdmin = password_hash('admin', PASSWORD_BCRYPT);

    if ($admin) {
        if (password_verify('admin', $admin['password'])) {
            // Credentials already correct; nothing to do.
            return;
        }

        $update = $pdo->prepare("UPDATE users SET username = 'admin', email = 'admin@learnspace.com', password = ?, is_admin = TRUE WHERE user_id = ?");
        $update->execute([$hashedAdmin, $admin['user_id']]);
        return;
    }

    $insert = $pdo->prepare("INSERT INTO users (username, email, password, is_admin) VALUES ('admin', 'admin@learnspace.com', ?, TRUE)");
    $insert->execute([$hashedAdmin]);
}

ensure_admin_exists();
?>
