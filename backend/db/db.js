// This file lets us talk to the database to read or write user information.
const mysql = require("mysql2/promise");
require("dotenv").config();

// Possible Need of editing. We can secure it using local .env files or just hardcode it making it less secure.
const pool = mysql.createPool({
    host: "localhost",
    user: "roots",
    password: "yourpassword",
    database: "287_d",
});

/*
What the .env would relatively look like:

# MySQL Database Configuration
DB_HOST=localhost       # database host
DB_USER=roots          # your MySQL username
DB_PASSWORD=yourpassword  # your MySQL password
DB_NAME=287_d          # your database name

# JWT Configuration
JWT_SECRET=supersecretkey  # secret key to sign JWT tokens

# Server Configuration
PORT=5000               # port your Node.js server will listen on


 */


module.exports = pool;



