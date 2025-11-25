const db = require('../db/db');
const { getResourceById, ensureResourceTimeslots } = require('./resourceModel');

async function getTimeslotById(timeslotId, connection = db) {
  const [rows] = await connection.execute('SELECT * FROM timeslots WHERE id = ?', [timeslotId]);
  return rows[0] || null;
}

async function listTimeslots(connection = db) {
  const [rows] = await connection.execute('SELECT * FROM timeslots ORDER BY start_time');
  return rows;
}

async function getAvailability(resourceId, date, connection = db) {
  if (!resourceId || !date) throw new Error('MISSING_FIELDS');
  const resource = await getResourceById(resourceId, connection);
  if (!resource) throw new Error('RESOURCE_NOT_FOUND');

  // Blackouts remove all availability
  const [blackouts] = await connection.execute(
    'SELECT 1 FROM resource_blackouts WHERE resource_id = ? AND blackout_date = ? LIMIT 1',
    [resourceId, date]
  );
  if (blackouts.length) {
    return { resource, available: [], booked: [], remainingQuantity: 0 };
  }

  if (resource.type === 'equipment') {
    const [used] = await connection.execute(
      `SELECT COALESCE(SUM(quantity),0) AS used
         FROM bookings
        WHERE resource_id = ? AND booking_date = ? AND status = 'active'`,
      [resourceId, date]
    );
    const remaining = Math.max((resource.quantity || 0) - (used[0]?.used || 0), 0);
    return { resource, available: [], booked: [], remainingQuantity: remaining };
  }

  await ensureResourceTimeslots(resourceId, resource.type, connection);

  const [allowed] = await connection.execute(
    `SELECT t.* FROM resource_timeslots rt JOIN timeslots t ON t.id = rt.timeslot_id
      WHERE rt.resource_id = ? AND rt.is_active = 1 ORDER BY t.start_time`,
    [resourceId]
  );
  const [booked] = await connection.execute(
    `SELECT timeslot_id FROM bookings WHERE resource_id = ? AND booking_date = ? AND status = 'active'`,
    [resourceId, date]
  );
  const bookedIds = new Set(booked.map((b) => b.timeslot_id));

  return {
    resource,
    available: allowed.filter((slot) => !bookedIds.has(slot.id)),
    booked: allowed.filter((slot) => bookedIds.has(slot.id)),
    remainingQuantity: null,
  };
}

function formatDateOnly(value) {
  if (!value) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function formatTime(value) {
  if (!value) return value;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{2}:\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().substring(11, 16);
}

async function mapBookingRow(row) {
  if (!row) return null;

  const user = row.user_id
    ? {
        id: row.user_id,
        username: row.user_username || row.username || null,
        email: row.user_email || row.email || null,
      }
    : null;

  const resource = row.resource_id
    ? {
        id: row.resource_id,
        name: row.resource_name,
        type: row.type,
        description: row.resource_description,
        capacity: row.resource_capacity,
        quantity: row.resource_quantity,
        image_path: row.image_path,
      }
    : null;

  const base = {
    booking_id: row.id,
    booking_type: row.type,
    booking_date: formatDateOnly(row.booking_date),
    status: normalizeBookingStatus(row.status, row.booking_date),
    user_id: row.user_id,
    user,
    user_name: user?.username,
    user_email: user?.email,
    resource,
  };

  if (row.type === 'room') {
    return {
      ...base,
      room: {
        id: row.resource_id,
        name: row.resource_name,
        description: row.resource_description,
        capacity: row.resource_capacity,
        image_path: row.image_path,
        timeslot_id: row.timeslot_id,
        label: row.timeslot_label,
        start_time: formatTime(row.start_time),
        end_time: formatTime(row.end_time),
      },
    };
  }
  if (row.type === 'lab') {
    return {
      ...base,
      lab: {
        id: row.resource_id,
        name: row.resource_name,
        description: row.resource_description,
        capacity: row.resource_capacity,
        image_path: row.image_path,
        timeslot_id: row.timeslot_id,
        label: row.timeslot_label,
        start_time: formatTime(row.start_time),
        end_time: formatTime(row.end_time),
      },
    };
  }
  return {
    ...base,
    equipment: {
      id: row.resource_id,
      name: row.resource_name,
      description: row.resource_description,
      capacity: row.resource_capacity,
      image_path: row.image_path,
      total_quantity: row.resource_quantity,
      quantity: row.quantity,
    },
  };
}

function normalizeBookingStatus(status, bookingDate) {
  if (!status) return 'active';
  if (status === 'active' && bookingDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(bookingDate);
    if (!Number.isNaN(date.getTime()) && date < today) {
      return 'completed';
    }
  }
  return status;
}

async function listForUser(userId) {
  const [rows] = await db.execute(
    `SELECT b.*, r.name AS resource_name, r.type, r.description AS resource_description, r.capacity AS resource_capacity,
            r.quantity AS resource_quantity, r.image_path, t.label AS timeslot_label, t.start_time, t.end_time,
            u.username AS user_username, u.email AS user_email
       FROM bookings b
       JOIN resources r ON r.id = b.resource_id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN timeslots t ON t.id = b.timeslot_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC`,
    [userId]
  );
  return Promise.all(rows.map(mapBookingRow));
}

async function listAll() {
  const [rows] = await db.execute(
    `SELECT b.*, r.name AS resource_name, r.type, r.description AS resource_description, r.capacity AS resource_capacity,
            r.quantity AS resource_quantity, r.image_path, t.label AS timeslot_label, t.start_time, t.end_time,
            u.username AS user_username, u.email AS user_email
       FROM bookings b
       JOIN resources r ON r.id = b.resource_id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN timeslots t ON t.id = b.timeslot_id
      ORDER BY b.created_at DESC`
  );
  return Promise.all(rows.map(mapBookingRow));
}

async function findById(id, connection = db) {
  const [rows] = await connection.execute(
    `SELECT b.*, r.name AS resource_name, r.type, r.description AS resource_description, r.capacity AS resource_capacity,
            r.quantity AS resource_quantity, r.image_path, t.label AS timeslot_label, t.start_time, t.end_time,
            u.username AS user_username, u.email AS user_email
       FROM bookings b
       JOIN resources r ON r.id = b.resource_id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN timeslots t ON t.id = b.timeslot_id
      WHERE b.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapBookingRow(rows[0]) : null;
}

async function ensureQuantity(connection, resource, date, quantity, excludeBookingId = null) {
  const params = [resource.id, date];
  let query = `SELECT COALESCE(SUM(quantity),0) AS used FROM bookings WHERE resource_id = ? AND booking_date = ? AND status = 'active'`;
  if (excludeBookingId) {
    query += ' AND id <> ?';
    params.push(excludeBookingId);
  }
  const [rows] = await connection.execute(query, params);
  const used = rows[0]?.used || 0;
  if (quantity < 1 || used + quantity > (resource.quantity || 0)) {
    throw new Error('EQUIPMENT_UNAVAILABLE');
  }
}

async function ensureSlotAvailable(connection, resource, date, timeslotId, excludeBookingId = null) {
  await ensureResourceTimeslots(resource.id, resource.type, connection);
  const slot = await getTimeslotById(timeslotId, connection);
  if (!slot) throw new Error('INVALID_TIMESLOT');

  const [allowed] = await connection.execute(
    'SELECT 1 FROM resource_timeslots WHERE resource_id = ? AND timeslot_id = ? AND is_active = 1 LIMIT 1',
    [resource.id, timeslotId]
  );
  if (!allowed.length) throw new Error('INVALID_TIMESLOT');

  const params = [resource.id, date, timeslotId];
  let query = `SELECT 1 FROM bookings WHERE resource_id = ? AND booking_date = ? AND timeslot_id = ? AND status = 'active'`;
  if (excludeBookingId) {
    query += ' AND id <> ?';
    params.push(excludeBookingId);
  }
  const [rows] = await connection.execute(query + ' LIMIT 1', params);
  if (rows.length) throw new Error(resource.type === 'room' ? 'ROOM_CONFLICT' : 'LAB_CONFLICT');
}

async function createBooking(payload, user) {
  const { resourceId, bookingDate, timeslotId, quantity } = payload;
  if (!resourceId || !bookingDate) throw new Error('MISSING_FIELDS');
  if (!user?.id) throw new Error('USER_NOT_FOUND');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const resource = await getResourceById(resourceId, connection);
    if (!resource) throw new Error('RESOURCE_NOT_FOUND');

    const [blackouts] = await connection.execute(
      'SELECT 1 FROM resource_blackouts WHERE resource_id = ? AND blackout_date = ? LIMIT 1',
      [resourceId, bookingDate]
    );
    if (blackouts.length) throw new Error('RESOURCE_BLACKED_OUT');

    if (resource.type === 'equipment') {
      await ensureQuantity(connection, resource, bookingDate, quantity || 1);
    } else {
      if (!timeslotId) throw new Error('MISSING_FIELDS');
      await ensureSlotAvailable(connection, resource, bookingDate, timeslotId);
    }

    const insertPayload = {
      user_id: user.id,
      resource_id: resource.id,
      booking_date: bookingDate,
      timeslot_id: resource.type === 'equipment' ? null : timeslotId,
      quantity: resource.type === 'equipment' ? quantity || 1 : 1,
      status: 'active',
      purpose: payload.purpose || null,
    };

    const columns = Object.keys(insertPayload);
    const values = Object.values(insertPayload);
    const placeholders = columns.map(() => '?').join(',');

    const [result] = await connection.execute(
      `INSERT INTO bookings (${columns.join(',')}) VALUES (${placeholders})`,
      values
    );

    await connection.commit();
    return findById(result.insertId, connection);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBooking(id, payload, user) {
  const existing = await findById(id);
  if (!existing) throw new Error('NOT_FOUND');
  if (!user?.is_admin && existing.user_id !== user?.id) throw new Error('FORBIDDEN');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const resource = await getResourceById(existing.room?.id || existing.lab?.id || existing.equipment?.id, connection);
    if (!resource) throw new Error('RESOURCE_NOT_FOUND');

    const nextDate = payload.bookingDate || existing.booking_date;
    if (resource.type === 'equipment') {
      const nextQty = payload.quantity || existing.equipment?.quantity || 1;
      await ensureQuantity(connection, resource, nextDate, nextQty, id);
      await connection.execute(
        'UPDATE bookings SET booking_date = ?, quantity = ? WHERE id = ?',
        [nextDate, nextQty, id]
      );
    } else {
      const nextSlot = payload.timeslotId || existing.room?.timeslot_id || existing.lab?.timeslot_id;
      await ensureSlotAvailable(connection, resource, nextDate, nextSlot, id);
      await connection.execute(
        'UPDATE bookings SET booking_date = ?, timeslot_id = ? WHERE id = ?',
        [nextDate, nextSlot, id]
      );
    }

    await connection.commit();
    return findById(id, connection);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function rescheduleBooking(id, payload, user) {
  const existing = await findById(id);
  if (!existing) throw new Error('NOT_FOUND');
  if (!user?.is_admin && existing.user_id !== user?.id) throw new Error('FORBIDDEN');
  if (existing.status && existing.status !== 'active') throw new Error('INVALID_STATUS');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const resourceId = existing.resource?.id || existing.room?.id || existing.lab?.id || existing.equipment?.id;
    const resource = await getResourceById(resourceId, connection);
    if (!resource) throw new Error('RESOURCE_NOT_FOUND');

    const nextDate = payload.bookingDate || existing.booking_date;
    const nextTimeslot = resource.type === 'equipment' ? null : payload.timeslotId || existing.room?.timeslot_id || existing.lab?.timeslot_id;
    const nextQuantity = resource.type === 'equipment' ? Number(payload.quantity || existing.equipment?.quantity || 1) : 1;

    const [blackouts] = await connection.execute(
      'SELECT 1 FROM resource_blackouts WHERE resource_id = ? AND blackout_date = ? LIMIT 1',
      [resource.id, nextDate]
    );
    if (blackouts.length) throw new Error('RESOURCE_BLACKED_OUT');

    if (resource.type === 'equipment') {
      await ensureQuantity(connection, resource, nextDate, nextQuantity, id);
    } else {
      if (!nextTimeslot) throw new Error('MISSING_FIELDS');
      await ensureSlotAvailable(connection, resource, nextDate, nextTimeslot, id);
    }

    await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', ['rescheduled', id]);

    const insertPayload = {
      user_id: existing.user_id,
      resource_id: resource.id,
      booking_date: nextDate,
      timeslot_id: resource.type === 'equipment' ? null : nextTimeslot,
      quantity: resource.type === 'equipment' ? nextQuantity : 1,
      status: 'active',
      purpose: payload.purpose || existing.purpose || null,
    };

    const columns = Object.keys(insertPayload);
    const values = Object.values(insertPayload);
    const placeholders = columns.map(() => '?').join(',');

    const [result] = await connection.execute(
      `INSERT INTO bookings (${columns.join(',')}) VALUES (${placeholders})`,
      values
    );

    await connection.commit();
    return findById(result.insertId, connection);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function cancelBooking(id, user) {
  const existing = await findById(id);
  if (!existing) return false;
  if (!user?.is_admin && existing.user_id !== user?.id) return 'FORBIDDEN';

  await db.execute('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', id]);
  return findById(id);
}

module.exports = {
  createBooking,
  getAvailability,
  listForUser,
  listAll,
  findById,
  updateBooking,
  rescheduleBooking,
  cancelBooking,
  listTimeslots,
};
