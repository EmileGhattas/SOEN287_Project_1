const db = require('../db/db');

async function findByEmail(email, connection = db) {
  const [rows] = await connection.execute('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  return rows[0] || null;
}

async function findById(id, connection = db) {
  const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createUser({ username, email, passwordHash, role = 'user' }) {
  const [result] = await db.execute(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [username, email.toLowerCase(), passwordHash, role]
  );
  return findById(result.insertId);
}

async function updateProfile(id, { username, email }, connection = db) {
  const user = await findById(id, connection);
  if (!user) return null;
  await connection.execute('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, id]);
  return findById(id, connection);
}

async function updatePassword(id, passwordHash, connection = db) {
  const user = await findById(id, connection);
  if (!user) return null;
  await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  return findById(id, connection);
}

async function deleteUserById(id) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM notifications WHERE user_id = ?', [id]);
    const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { findByEmail, createUser, findById, updateProfile, updatePassword, deleteUserById };
