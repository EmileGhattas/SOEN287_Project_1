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

async function listResources(whereClause = '', params = []) {
  const [rows] = await db.execute(
    `SELECT r.id,
            r.name,
            r.type,
            r.description,
            r.location,
            CASE WHEN r.type IN ('room', 'lab') THEN r.capacity ELSE NULL END AS capacity,
            CASE WHEN r.type = 'equipment' THEN r.quantity ELSE NULL END AS quantity,
            CASE WHEN r.type = 'equipment'
                 THEN GREATEST(COALESCE(r.quantity, 0) - COALESCE(ab.quantity_sum, 0), 0)
                 ELSE NULL
            END AS current_quantity,
            r.image_path,
            CASE WHEN r.type = 'equipment'
                 THEN COALESCE(ab.quantity_sum, 0)
                 ELSE COALESCE(ab.booking_count, 0)
            END AS booking_count,
            COALESCE(ro.blackout_count, 0) AS blackout_count,
            CASE WHEN r.type IN ('room', 'lab')
                 THEN CASE WHEN EXISTS (
                        SELECT 1 FROM resource_timeslots rt
                         WHERE rt.resource_id = r.id AND rt.is_active = 1
                       ) THEN 0 ELSE 1 END
                 ELSE 0
            END AS is_disabled
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
      ${whereClause}
      ORDER BY r.name`,
    params
  );
  return rows;
}

async function upsertResourceTimeslot(resourceId, update, connection = db) {
  let timeslotId = update.id || update.timeslot_id;

  if (!timeslotId && update.label && update.start_time && update.end_time) {
    const label = update.label;
    const startTime = `${update.start_time}:00`;
    const endTime = `${update.end_time}:00`;
    const [existing] = await connection.execute('SELECT id FROM timeslots WHERE label = ?', [label]);
    if (existing[0]?.id) {
      timeslotId = existing[0].id;
    } else {
      const [inserted] = await connection.execute(
        'INSERT INTO timeslots (label, start_time, end_time) VALUES (?, ?, ?)',
        [label, startTime, endTime]
      );
      timeslotId = inserted.insertId;
    }
  }

  if (!timeslotId) return null;

  const isActive = update.is_active === false ? 0 : 1;
  await connection.execute(
    `INSERT INTO resource_timeslots (resource_id, timeslot_id, is_active)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)`,
    [resourceId, timeslotId, isActive]
  );

  return timeslotId;
}

async function applyTimeslotUpdates(resourceId, updates, resourceType, connection = db) {
  if (!Array.isArray(updates) || !updates.length) return;
  await ensureResourceTimeslots(resourceId, resourceType, connection);
  for (const update of updates) {
    // eslint-disable-next-line no-await-in-loop
    await upsertResourceTimeslot(resourceId, update, connection);
  }
}

async function toggleAllTimeslots(resourceId, isActive, resourceType, connection = db) {
  await ensureResourceTimeslots(resourceId, resourceType, connection);
  await connection.execute(
    'UPDATE resource_timeslots SET is_active = ? WHERE resource_id = ?',
    [isActive ? 1 : 0, resourceId]
  );
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
  const [withAggregates] = await listResources('WHERE r.id = ?', [resource.id]);
  return withAggregates || resource;
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

  if (payload.disable_all_timeslots !== undefined && (fields.type === 'room' || fields.type === 'lab')) {
    await toggleAllTimeslots(id, !payload.disable_all_timeslots, fields.type);
  }

  if (Array.isArray(payload.timeslotUpdates) && payload.timeslotUpdates.length && (fields.type === 'room' || fields.type === 'lab')) {
    await applyTimeslotUpdates(id, payload.timeslotUpdates, fields.type);
  }
  const [withAggregates] = await listResources('WHERE r.id = ?', [id]);
  return withAggregates || (await getResourceById(id));
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
