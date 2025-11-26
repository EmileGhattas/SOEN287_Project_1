const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, authController.updateProfile);
router.put('/me/password', authenticate, authController.changePassword);
router.delete('/me', authenticate, authController.deleteAccount);

module.exports = router;
