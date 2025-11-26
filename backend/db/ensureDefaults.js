const bcrypt = require('bcrypt');
const db = require('./db');

const DEFAULT_USERS = [
  { username: 'Admin', email: 'admin@learnspace.com', password: 'Admin@123', role: 'admin' },
  { username: 'Demo User', email: 'demo@learnspace.com', password: 'Password@123', role: 'user' },
];

async function upsertUser({ username, email, password, role }) {
  const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
  const passwordHash = await bcrypt.hash(password, 10);

  if (rows.length === 0) {
    await db.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );
    return;
  }

  const userId = rows[0].id;
  await db.execute(
    'UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?',
    [username, role, passwordHash, userId]
  );
}

async function ensureDefaultUsers() {
  for (const user of DEFAULT_USERS) {
    await upsertUser(user);
  }
}

async function ensureBookingStatusEnum() {
  const [rows] = await db.execute(
    `SELECT COLUMN_TYPE
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'bookings'
        AND column_name = 'status'
      LIMIT 1`
  );

  if (!rows.length) return;

  const columnType = rows[0].COLUMN_TYPE || '';
  if (!columnType.includes("'rescheduled'")) {
    await db.execute(
      "ALTER TABLE bookings MODIFY status ENUM('active','cancelled','rescheduled','completed') DEFAULT 'active'"
    );
  }
}

async function ensureDefaults() {
  await ensureBookingStatusEnum();
  await ensureDefaultUsers();
}

module.exports = { ensureDefaultUsers, ensureDefaults, ensureBookingStatusEnum };
