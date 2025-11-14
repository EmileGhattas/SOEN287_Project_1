const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Path to your SQLite DB file
const dbPath = path.join(__dirname, "../287_D.db");

module.exports = router;
