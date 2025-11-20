<?php

$DB_HOST = 'localhost';
$DB_NAME = 'learnspace';
$DB_USER = 'root';
$DB_PASSWORD = 'yourpassword';


try {
    $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";

    $pdo = new PDO($dsn, $DB_USER, $DB_PASSWORD);

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch (PDOException $e) {
    die("MySQL connection failed: " . $e->getMessage());
}


