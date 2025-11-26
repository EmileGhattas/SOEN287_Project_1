const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

function normalize(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, email: user.email, is_admin: user.role === 'admin' };
}

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.createUser({ username, email, passwordHash });
    const payload = normalize(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ user: payload, token });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const payload = normalize(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.json({ user: payload, token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: normalize(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ message: 'Username and email required' });
    const updated = await User.updateProfile(req.user.id, { username, email });
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ user: normalize(updated) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(req.user.id, passwordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Admins cannot delete their account' });

    const deleted = await User.deleteUserById(req.user.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
