const db = require('../db/db');

async function findByEmail(email) {
  const [rows] = await db.execute('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createUser({ username, email, passwordHash, role = 'user' }) {
  const [result] = await db.execute(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [username, email.toLowerCase(), passwordHash, role]
  );
  return findById(result.insertId);
}

async function updateProfile(id, { username, email }) {
  const user = await findById(id);
  if (!user) return null;
  await db.execute('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, id]);
  return findById(id);
}

module.exports = { findByEmail, createUser, findById, updateProfile };
