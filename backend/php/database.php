<?php

$DB_HOST = 'localhost';
$DB_NAME = '287_D';
$DB_USER = 'root';
$DB_PASS = '';


try {
    $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";

    $pdo = new PDO($dsn, $DB_USER, $DB_PASS);

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch (PDOException $e) {
    die("MySQL connection failed: " . $e->getMessage());
}


