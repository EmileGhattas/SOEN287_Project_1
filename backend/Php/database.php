<?php

$pdo = new PDO('sqlite:' . __DIR__ . '/287_D.db');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("PRAGMA foreign_keys = ON;");

