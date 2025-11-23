//This file checks if the user exists, encrypts passwords, and decides whether to allow access or not
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const {validationResult } = require("express-validator");
const JWT_SECRET = "supersecretkey123";


const SALT_ROUNDS = 10;


exports.signup = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });


        const { username, email, password } = req.body;


        const existing = await User.findByEmail(email);
        if (existing) return res.status(409).json({ message: "Email already in use" });


        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);


        const user = await User.createUser({ username, email, passwordHash });


        const normalizedUser = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            is_admin: Boolean(user.is_admin),
        };

        const token = jwt.sign(
            { user_id: normalizedUser.user_id, email: normalizedUser.email, is_admin: normalizedUser.is_admin },
            JWT_SECRET,
            { expiresIn: "1d" }
        );


        res.status(201).json({ user: normalizedUser, token });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Server error" });
    }
};


exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });


        const { email, password } = req.body;


        const user = await User.findByEmail(email);
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

// fix/edit needed. Possible column name mismatch
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Invalid credentials" });


        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, is_admin: user.is_admin },
            JWT_SECRET,
            { expiresIn: "1d" }
        );


        res.json({
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin),
            },
            token,
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};