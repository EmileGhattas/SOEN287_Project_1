//This file is used to get user info from the database or save a new user.
const db = require("../db/db");


// Find user by email
const findByEmail = async (email) => {
    const [rows] = await db.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
    );
    return rows[0];
};


// Create user
const createUser = async ({ username, email, passwordHash }) => {
    const [result] = await db.execute(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, passwordHash]
    );
    return { id: result.insertId, username, email, is_admin:false};
};


module.exports = { findByEmail, createUser };