//This file checks if the user exists, encrypts passwords, and decides whether to allow access or not
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { validationResult } = require("express-validator");


const SALT_ROUNDS = 10;


exports.signup = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });


        const { name, email, password } = req.body;


        const existing = await User.findByEmail(email);
        if (existing) return res.status(409).json({ message: "Email already in use" });


        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);


        const user = await User.createUser({ name, email, passwordHash });


        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );


        res.status(201).json({ user, token });
    } catch (err) {
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
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: "Invalid credentials" });


        const token = jwt.sign(
            { id: user.id, email: user.email, admin: user.admin },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );


        res.json({ user: { id: user.id, name: user.name, email: user.email, admin: user.admin }, token });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};