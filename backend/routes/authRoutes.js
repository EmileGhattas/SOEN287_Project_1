// routes/authRoutes.js.
// This file is like a map; when the user tries to log in or sign up, it tells the app which logic to run
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

module.exports = router;
