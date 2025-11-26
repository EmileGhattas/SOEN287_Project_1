const db = require('../db/db');

function normalizeNotification(row) {
  if (!row) return null;
  return { ...row, is_read: Boolean(row.is_read) };
}

function formatDateOnly(value) {
  if (!value) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

async function addNotification(userId, title, message, connection = db) {
  if (!userId || !title || !message) throw new Error('INVALID_NOTIFICATION_PAYLOAD');
  const [result] = await connection.execute(
    'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
    [userId, title, message]
  );
  const [rows] = await connection.execute('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
  return normalizeNotification(rows[0]);
}

async function getNotifications(userId) {
  const [rows] = await db.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(normalizeNotification);
}

async function markAllAsRead(userId) {
  await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  const [rows] = await db.execute('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return rows[0]?.unread || 0;
}

async function getUnreadCount(userId) {
  const [rows] = await db.execute('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return rows[0]?.unread || 0;
}

async function notifyBlackoutForResource(resource, blackoutDate, reason) {
  if (!resource?.id || !blackoutDate) return { futureNotified: 0, cancelled: 0 };
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const resourceName = resource.name || 'Resource';

    const [futureBookings] = await connection.execute(
      `SELECT DISTINCT user_id
         FROM bookings
        WHERE resource_id = ?
          AND status = 'active'
          AND booking_date >= CURDATE()`,
      [resource.id]
    );

    for (const row of futureBookings) {
      await addNotification(
        row.user_id,
        'Resource Blackout Notice',
        `A blackout has been applied to ${resourceName}. Reason: ${reason || 'N/A'}.`,
        connection
      );
    }

    const [affectedBookings] = await connection.execute(
      `SELECT b.id, b.user_id, b.booking_date, b.timeslot_id, t.label
         FROM bookings b
         LEFT JOIN timeslots t ON t.id = b.timeslot_id
        WHERE b.resource_id = ?
          AND b.booking_date = ?
          AND b.status = 'active'`,
      [resource.id, blackoutDate]
    );

    if (affectedBookings.length) {
      await connection.execute(
        `UPDATE bookings SET status = 'cancelled'
          WHERE resource_id = ?
            AND booking_date = ?
            AND status = 'active'`,
        [resource.id, blackoutDate]
      );

      for (const booking of affectedBookings) {
        const window = booking.timeslot_id && booking.label ? `${formatDateOnly(booking.booking_date)} ${booking.label}` : formatDateOnly(booking.booking_date);
        await addNotification(
          booking.user_id,
          'Booking Cancelled',
          `Your booking for ${resourceName} on ${window} was cancelled due to a blackout.`,
          connection
        );
      }
    }

    await connection.commit();
    return { futureNotified: futureBookings.length, cancelled: affectedBookings.length };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  addNotification,
  getNotifications,
  markAllAsRead,
  getUnreadCount,
  notifyBlackoutForResource,
};
