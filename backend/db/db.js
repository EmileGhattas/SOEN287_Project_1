// This file lets us talk to the database to read or write user information.
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();

// Database configuration. Environment variables can override the defaults for local setups.
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "287_d",
});

async function ensureAdminUser() {
    const connection = await pool.getConnection();

    try {
        const [rows] = await connection.execute(
            "SELECT user_id, password FROM users WHERE username = 'admin' OR email = 'admin@learnspace.com' LIMIT 1"
        );

        const adminPassword = "admin";

        if (rows.length > 0) {
            const admin = rows[0];
            const valid = await bcrypt.compare(adminPassword, admin.password);

            if (!valid) {
                const hashed = await bcrypt.hash(adminPassword, 12);
                await connection.execute(
                    "UPDATE users SET username = 'admin', email = 'admin@learnspace.com', password = ?, is_admin = TRUE WHERE user_id = ?",
                    [hashed, admin.user_id]
                );
            }

            return;
        }

        const hashed = await bcrypt.hash(adminPassword, 12);
        await connection.execute(
            "INSERT INTO users (username, email, password, is_admin) VALUES ('admin', 'admin@learnspace.com', ?, TRUE)",
            [hashed]
        );
    } finally {
        connection.release();
    }
}

ensureAdminUser().catch((err) => {
    console.error("Failed to ensure admin user exists", err);
});

module.exports = pool;
