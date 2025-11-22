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
const createUser = async ({ name, email, passwordHash }) => {
    const [result] = await db.execute(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [name, email, passwordHash]
    );
    return { id: result.insertId, name, email };
};


module.exports = { findByEmail, createUser };