const db = require('../db/db');

async function ensureResourceTimeslots(resourceId, type, connection = db) {
  if (type === 'equipment') return;
  const [count] = await connection.execute(
    'SELECT COUNT(*) AS total FROM resource_timeslots WHERE resource_id = ?',
    [resourceId]
  );
  if ((count[0]?.total || 0) === 0) {
    await connection.execute(
      'INSERT INTO resource_timeslots (resource_id, timeslot_id) SELECT ?, id FROM timeslots',
      [resourceId]
    );
  }
}

async function listResources() {
  const [rows] = await db.execute(
    `SELECT r.id, r.name, r.type, r.description, r.location, r.capacity, r.quantity, r.image_path,
            CASE WHEN r.type = 'equipment'
                 THEN COALESCE(ab.quantity_sum, 0)
                 ELSE COALESCE(ab.booking_count, 0)
            END AS booking_count,
            COALESCE(ro.blackout_count, 0) AS blackout_count
       FROM resources r
       LEFT JOIN (
              SELECT resource_id,
                     COUNT(id) AS booking_count,
                     SUM(COALESCE(quantity, 0)) AS quantity_sum
                FROM bookings
               WHERE status = 'active'
               GROUP BY resource_id
            ) ab ON ab.resource_id = r.id
       LEFT JOIN (
              SELECT resource_id, COUNT(id) AS blackout_count
                FROM resource_blackouts
               GROUP BY resource_id
            ) ro ON ro.resource_id = r.id
      ORDER BY r.name`
  );
  return rows;
}

async function getResourceById(id, connection = db) {
  const [rows] = await connection.execute('SELECT * FROM resources WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createResource(payload) {
  const { name, type, description, location, capacity, quantity, image_path } = payload;
  const [result] = await db.execute(
    `INSERT INTO resources (name, type, description, location, capacity, quantity, image_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, type, description || null, location || null, capacity || null, quantity || null, image_path ?? null]
  );
  const resource = await getResourceById(result.insertId);
  await ensureResourceTimeslots(resource.id, resource.type);
  return resource;
}

async function updateResource(id, payload) {
  const existing = await getResourceById(id);
  if (!existing) throw new Error('NOT_FOUND');
  const fields = {
    name: payload.name ?? existing.name,
    type: payload.type ?? existing.type,
    description: payload.description ?? existing.description,
    location: payload.location ?? existing.location,
    capacity: payload.capacity ?? existing.capacity,
    quantity: payload.quantity ?? existing.quantity,
    image_path: payload.image_path ?? existing.image_path,
  };
  await db.execute(
    `UPDATE resources SET name = ?, type = ?, description = ?, location = ?, capacity = ?, quantity = ?, image_path = ?
     WHERE id = ?`,
    [fields.name, fields.type, fields.description, fields.location, fields.capacity, fields.quantity, fields.image_path, id]
  );
  await ensureResourceTimeslots(id, fields.type);
  return getResourceById(id);
}

async function deleteResource(id) {
  await db.execute('DELETE FROM resources WHERE id = ?', [id]);
}

async function listBlackouts(resourceId) {
  const [rows] = await db.execute(
    'SELECT id, blackout_date, reason FROM resource_blackouts WHERE resource_id = ? ORDER BY blackout_date',
    [resourceId]
  );
  return rows;
}

async function addBlackout(resourceId, blackoutDate, reason) {
  await db.execute(
    `INSERT INTO resource_blackouts (resource_id, blackout_date, reason)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
    [resourceId, blackoutDate, reason || null]
  );
  return listBlackouts(resourceId);
}

async function deleteBlackout(resourceId, blackoutId) {
  await db.execute('DELETE FROM resource_blackouts WHERE id = ? AND resource_id = ?', [blackoutId, resourceId]);
  return listBlackouts(resourceId);
}

async function resourceStats() {
  const [rows] = await db.execute(
    `SELECT r.id, r.name, r.type, COUNT(b.id) AS bookings
       FROM resources r
       LEFT JOIN bookings b ON b.resource_id = r.id AND b.status = 'active'
      GROUP BY r.id
      ORDER BY bookings DESC`
  );
  return rows;
}

module.exports = {
  listResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  ensureResourceTimeslots,
  listBlackouts,
  addBlackout,
  deleteBlackout,
  resourceStats,
};
