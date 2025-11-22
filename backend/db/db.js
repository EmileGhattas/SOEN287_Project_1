// Database connection pool for MySQL queries
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const {
    DB_HOST = "localhost",
    DB_USER = "roots",
    DB_PASSWORD = "yourpassword",
    DB_NAME = "287_d",
    DB_PORT = 3306,
} = process.env;

const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: Number(DB_PORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Verify the pool can obtain a connection at startup
pool
    .getConnection()
    .then((connection) => connection.release())
    .catch((err) => {
        console.error("Unable to establish a database connection:", err.message);
    });

module.exports = pool;
