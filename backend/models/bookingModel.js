const db = require("../db/db");

const DEFAULT_TIMESLOTS = [
    { label: "09:00-10:30", start: "09:00:00", end: "10:30:00" },
    { label: "10:30-12:00", start: "10:30:00", end: "12:00:00" },
    { label: "12:00-13:30", start: "12:00:00", end: "13:30:00" },
    { label: "13:30-15:00", start: "13:30:00", end: "15:00:00" },
    { label: "15:00-16:30", start: "15:00:00", end: "16:30:00" },
    { label: "16:30-18:00", start: "16:30:00", end: "18:00:00" },
    { label: "18:00-19:30", start: "18:00:00", end: "19:30:00" },
    { label: "19:30-21:00", start: "19:30:00", end: "21:00:00" },
    { label: "21:00-22:30", start: "21:00:00", end: "22:30:00" },
    { label: "22:30-00:00", start: "22:30:00", end: "00:00:00" },
];

const BASE_QUERY = `
    SELECT b.booking_id, b.booking_type, b.booking_date, b.user_id, u.username, u.email,
           rb.room_id, rb.timeslot_id AS room_timeslot_id, r.name AS room_name, rts.start_time AS room_start, rts.end_time AS room_end, rts.label AS room_label,
           lb.lab_id, lb.timeslot_id AS lab_timeslot_id, l.name AS lab_name, lts.start_time AS lab_start, lts.end_time AS lab_end, lts.label AS lab_label,
           eb.equipment_id, e.name AS equipment_name, eb.quantity
      FROM bookings b
      JOIN users u ON u.user_id = b.user_id
      LEFT JOIN room_bookings rb ON rb.booking_id = b.booking_id
      LEFT JOIN rooms r ON r.room_id = rb.room_id
      LEFT JOIN timeslots rts ON rts.timeslot_id = rb.timeslot_id
      LEFT JOIN lab_bookings lb ON lb.booking_id = b.booking_id
      LEFT JOIN labs l ON l.lab_id = lb.lab_id
      LEFT JOIN timeslots lts ON lts.timeslot_id = lb.timeslot_id
      LEFT JOIN equipment_bookings eb ON eb.booking_id = b.booking_id
      LEFT JOIN equipment e ON e.equipment_id = eb.equipment_id`;

function mapRow(row) {
    return {
        booking_id: row.booking_id,
        booking_type: row.booking_type,
        booking_date: row.booking_date,
        user_id: row.user_id,
        user_name: row.username,
        user_email: row.email,
        room:
            row.booking_type === "room"
                ? {
                      id: row.room_id,
                      name: row.room_name,
                      start_time: row.room_start,
                      end_time: row.room_end,
                      timeslot_id: row.room_timeslot_id,
                      label: row.room_label,
                  }
                : null,
        lab:
            row.booking_type === "lab"
                ? {
                      id: row.lab_id,
                      name: row.lab_name,
                      start_time: row.lab_start,
                      end_time: row.lab_end,
                      timeslot_id: row.lab_timeslot_id,
                      label: row.lab_label,
                  }
                : null,
        equipment:
            row.booking_type === "equipment"
                ? { id: row.equipment_id, name: row.equipment_name, quantity: row.quantity }
                : null,
    };
}

async function ensureTimeslotSeeds(connection = db) {
    const [countRows] = await connection.execute("SELECT COUNT(*) AS total FROM timeslots");
    if ((countRows[0]?.total || 0) === 0) {
        for (const slot of DEFAULT_TIMESLOTS) {
            await connection.execute(
                "INSERT INTO timeslots(label, start_time, end_time) VALUES (?, ?, ?)",
                [slot.label, slot.start, slot.end]
            );
        }
    }

    const [rooms] = await connection.execute("SELECT room_id FROM rooms");
    if (rooms.length) {
        for (const room of rooms) {
            const [rt] = await connection.execute(
                "SELECT COUNT(*) AS total FROM room_timeslots WHERE room_id = ?",
                [room.room_id]
            );
            if ((rt[0]?.total || 0) === 0) {
                await connection.execute(
                    "INSERT INTO room_timeslots(room_id, timeslot_id) SELECT ?, timeslot_id FROM timeslots",
                    [room.room_id]
                );
            }
        }
    }

    const [labs] = await connection.execute("SELECT lab_id FROM labs");
    if (labs.length) {
        for (const lab of labs) {
            const [lt] = await connection.execute(
                "SELECT COUNT(*) AS total FROM lab_timeslots WHERE lab_id = ?",
                [lab.lab_id]
            );
            if ((lt[0]?.total || 0) === 0) {
                await connection.execute(
                    "INSERT INTO lab_timeslots(lab_id, timeslot_id) SELECT ?, timeslot_id FROM timeslots",
                    [lab.lab_id]
                );
            }
        }
    }
}

async function getTimeslotById(timeslotId, connection = db) {
    const [rows] = await connection.execute("SELECT * FROM timeslots WHERE timeslot_id = ?", [timeslotId]);
    return rows[0] || null;
}

async function getResourceTimeslots(resourceType, resourceId, connection = db) {
    await ensureTimeslotSeeds(connection);
    if (!resourceId) return [];

    let query;
    if (resourceType === "room") {
        query = `SELECT ts.* FROM room_timeslots rt JOIN timeslots ts ON ts.timeslot_id = rt.timeslot_id WHERE rt.room_id = ? ORDER BY ts.start_time`;
    } else if (resourceType === "lab") {
        query = `SELECT ts.* FROM lab_timeslots lt JOIN timeslots ts ON ts.timeslot_id = lt.timeslot_id WHERE lt.lab_id = ? ORDER BY ts.start_time`;
    } else {
        return [];
    }

    const [rows] = await connection.execute(query, [resourceId]);
    return rows;
}

async function getRoomAvailability(roomId, date, roomName = null) {
    if (!roomId && !roomName) {
        throw new Error("MISSING_FIELDS");
    }
    if (!date) {
        throw new Error("MISSING_FIELDS");
    }

    const [roomRows] = await db.execute(
        roomName ? "SELECT room_id FROM rooms WHERE room_id = ? OR name = ? LIMIT 1" : "SELECT room_id FROM rooms WHERE room_id = ? LIMIT 1",
        roomName ? [roomId || null, roomName] : [roomId]
    );
    const room = roomRows[0];
    if (!room) {
        throw new Error("ROOM_NOT_FOUND");
    }

    await ensureTimeslotSeeds();

    const allowed = await getResourceTimeslots("room", room.room_id);
    const [booked] = await db.execute(
        `SELECT rb.timeslot_id
           FROM room_bookings rb
           JOIN bookings b ON b.booking_id = rb.booking_id
          WHERE rb.room_id = ? AND rb.booking_date = ?`,
        [room.room_id, date]
    );
    const bookedIds = new Set(booked.map((b) => b.timeslot_id));

    return {
        room_id: room.room_id,
        availableTimeslots: allowed.filter((slot) => !bookedIds.has(slot.timeslot_id)),
        bookedTimeslots: allowed.filter((slot) => bookedIds.has(slot.timeslot_id)),
    };
}

async function getLabAvailability(labId, date, labName = null) {
    if (!labId && !labName) {
        throw new Error("MISSING_FIELDS");
    }
    if (!date) {
        throw new Error("MISSING_FIELDS");
    }

    const [labRows] = await db.execute(
        labName ? "SELECT lab_id FROM labs WHERE lab_id = ? OR name = ? LIMIT 1" : "SELECT lab_id FROM labs WHERE lab_id = ? LIMIT 1",
        labName ? [labId || null, labName] : [labId]
    );
    const lab = labRows[0];
    if (!lab) {
        throw new Error("LAB_NOT_FOUND");
    }

    await ensureTimeslotSeeds();

    const allowed = await getResourceTimeslots("lab", lab.lab_id);
    const [booked] = await db.execute(
        `SELECT lb.timeslot_id
           FROM lab_bookings lb
           JOIN bookings b ON b.booking_id = lb.booking_id
          WHERE lb.lab_id = ? AND lb.booking_date = ?`,
        [lab.lab_id, date]
    );
    const bookedIds = new Set(booked.map((b) => b.timeslot_id));

    return {
        lab_id: lab.lab_id,
        availableTimeslots: allowed.filter((slot) => !bookedIds.has(slot.timeslot_id)),
        bookedTimeslots: allowed.filter((slot) => bookedIds.has(slot.timeslot_id)),
    };
}

async function getBookingById(bookingId, connection = db) {
    const [rows] = await connection.execute(`${BASE_QUERY} WHERE b.booking_id = ? LIMIT 1`, [bookingId]);
    return rows[0] ? mapRow(rows[0]) : null;
}

async function ensureOwnership(booking, user) {
    if (!booking) return false;
    if (user?.is_admin) return true;
    return booking.user_id === user?.user_id;
}

async function ensureEquipmentAvailability(connection, equipmentId, bookingDate, quantity, excludeBookingId = null) {
    const [equipRows] = await connection.execute(
        "SELECT equipment_id, total_quantity FROM equipment WHERE equipment_id = ?",
        [equipmentId]
    );
    if (!equipRows.length) {
        throw new Error("EQUIPMENT_NOT_FOUND");
    }
    const equipment = equipRows[0];

    const params = [equipmentId, bookingDate];
    let usageQuery = `SELECT COALESCE(SUM(eb.quantity), 0) AS used
                        FROM equipment_bookings eb
                        JOIN bookings b ON b.booking_id = eb.booking_id
                       WHERE eb.equipment_id = ? AND b.booking_date = ?`;
    if (excludeBookingId) {
        usageQuery += " AND b.booking_id <> ?";
        params.push(excludeBookingId);
    }
    const [usageRows] = await connection.execute(usageQuery, params);
    const used = usageRows[0]?.used || 0;

    if (quantity <= 0 || used + quantity > equipment.total_quantity) {
        throw new Error("EQUIPMENT_UNAVAILABLE");
    }
    return equipment;
}

async function ensureResourceTimeslot(connection, resourceType, resourceId, timeslotId) {
    await ensureTimeslotSeeds(connection);
    const [rows] = await connection.execute("SELECT timeslot_id FROM timeslots WHERE timeslot_id = ?", [timeslotId]);
    if (!rows.length) {
        throw new Error("INVALID_TIMESLOT");
    }
    const table = resourceType === "room" ? "room_timeslots" : "lab_timeslots";
    const key = resourceType === "room" ? "room_id" : "lab_id";
    const [allowed] = await connection.execute(
        `SELECT 1 FROM ${table} WHERE ${key} = ? AND timeslot_id = ? LIMIT 1`,
        [resourceId, timeslotId]
    );
    if (!allowed.length) {
        throw new Error("INVALID_TIMESLOT");
    }
    return rows[0];
}

async function ensureRoomAvailability(connection, roomId, bookingDate, timeslotId, excludeBookingId = null) {
    await ensureResourceTimeslot(connection, "room", roomId, timeslotId);
    const params = [roomId, bookingDate, timeslotId];
    let query = `SELECT 1 FROM room_bookings rb JOIN bookings b ON b.booking_id = rb.booking_id
                 WHERE rb.room_id = ? AND rb.booking_date = ? AND rb.timeslot_id = ?`;
    if (excludeBookingId) {
        query += " AND b.booking_id <> ?";
        params.push(excludeBookingId);
    }
    const [rows] = await connection.execute(query + " LIMIT 1", params);
    if (rows.length) {
        throw new Error("ROOM_CONFLICT");
    }
}

async function ensureLabAvailability(connection, labId, bookingDate, timeslotId, excludeBookingId = null) {
    await ensureResourceTimeslot(connection, "lab", labId, timeslotId);
    const params = [labId, bookingDate, timeslotId];
    let query = `SELECT 1 FROM lab_bookings lb JOIN bookings b ON b.booking_id = lb.booking_id
                 WHERE lb.lab_id = ? AND lb.booking_date = ? AND lb.timeslot_id = ?`;
    if (excludeBookingId) {
        query += " AND b.booking_id <> ?";
        params.push(excludeBookingId);
    }
    const [rows] = await connection.execute(query + " LIMIT 1", params);
    if (rows.length) {
        throw new Error("LAB_CONFLICT");
    }
}

async function createBooking(payload, user) {
    const { bookingType, roomId, labId, equipmentId, bookingDate, timeslotId, quantity } = payload;
    if (!bookingType || !bookingDate) {
        throw new Error("MISSING_FIELDS");
    }
    if (!user?.user_id) {
        throw new Error("USER_NOT_FOUND");
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await ensureTimeslotSeeds(connection);

        const [userRows] = await connection.execute("SELECT user_id FROM users WHERE user_id = ?", [user.user_id]);
        if (!userRows.length) {
            throw new Error("USER_NOT_FOUND");
        }

        const [bookingResult] = await connection.execute(
            "INSERT INTO bookings (user_id, booking_type, booking_date) VALUES (?, ?, ?)",
            [user.user_id, bookingType, bookingDate]
        );
        const bookingId = bookingResult.insertId;

        if (bookingType === "room") {
            if (!roomId || !timeslotId) throw new Error("MISSING_FIELDS");
            await ensureRoomAvailability(connection, roomId, bookingDate, timeslotId);
            await connection.execute(
                "INSERT INTO room_bookings (booking_id, room_id, booking_date, timeslot_id) VALUES (?, ?, ?, ?)",
                [bookingId, roomId, bookingDate, timeslotId]
            );
        } else if (bookingType === "lab") {
            if (!labId || !timeslotId) throw new Error("MISSING_FIELDS");
            await ensureLabAvailability(connection, labId, bookingDate, timeslotId);
            await connection.execute(
                "INSERT INTO lab_bookings (booking_id, lab_id, booking_date, timeslot_id) VALUES (?, ?, ?, ?)",
                [bookingId, labId, bookingDate, timeslotId]
            );
        } else if (bookingType === "equipment") {
            if (!equipmentId || !quantity) throw new Error("MISSING_FIELDS");
            await ensureEquipmentAvailability(connection, equipmentId, bookingDate, quantity);
            await connection.execute(
                "INSERT INTO equipment_bookings (booking_id, equipment_id, booking_date, quantity) VALUES (?, ?, ?, ?)",
                [bookingId, equipmentId, bookingDate, quantity]
            );
        } else {
            throw new Error("INVALID_TYPE");
        }

        await connection.commit();
        const created = await getBookingById(bookingId);
        return created;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function getAllBookings() {
    const [rows] = await db.execute(`${BASE_QUERY} ORDER BY b.created_at DESC`);
    return rows.map(mapRow);
}

async function getBookingsForUser(user) {
    if (!user?.user_id) return [];
    const [rows] = await db.execute(`${BASE_QUERY} WHERE b.user_id = ? ORDER BY b.created_at DESC`, [user.user_id]);
    return rows.map(mapRow);
}

async function updateBooking(bookingId, payload, user) {
    const existing = await getBookingById(bookingId);
    if (!existing) {
        throw new Error("NOT_FOUND");
    }
    const allowed = await ensureOwnership(existing, user);
    if (!allowed) {
        throw new Error("FORBIDDEN");
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await ensureTimeslotSeeds(connection);

        if (existing.booking_type === "room") {
            const newDate = payload.bookingDate || existing.booking_date;
            const newRoom = payload.roomId || existing.room?.id;
            const newTimeslot = payload.timeslotId || payload.timeSlotId || existing.room?.timeslot_id || null;
            const timeslotToUse = newTimeslot || existing.room?.timeslot_id;
            const [detail] = await connection.execute(
                "SELECT room_id, timeslot_id FROM room_bookings WHERE booking_id = ? FOR UPDATE",
                [bookingId]
            );
            const currentDetail = detail[0];
            const nextTimeslotId = timeslotToUse || currentDetail?.timeslot_id;
            const nextRoomId = newRoom || currentDetail?.room_id;
            if (!nextRoomId || !nextTimeslotId) throw new Error("INVALID_ROOM");
            await ensureRoomAvailability(connection, nextRoomId, newDate, nextTimeslotId, bookingId);
            await connection.execute("UPDATE bookings SET booking_date = ? WHERE booking_id = ?", [newDate, bookingId]);
            await connection.execute(
                "UPDATE room_bookings SET room_id = ?, booking_date = ?, timeslot_id = ? WHERE booking_id = ?",
                [nextRoomId, newDate, nextTimeslotId, bookingId]
            );
        } else if (existing.booking_type === "lab") {
            const newDate = payload.bookingDate || existing.booking_date;
            const newLab = payload.labId || existing.lab?.id;
            const newTimeslot = payload.timeslotId || payload.timeSlotId || existing.lab?.timeslot_id || null;
            const [detail] = await connection.execute(
                "SELECT lab_id, timeslot_id FROM lab_bookings WHERE booking_id = ? FOR UPDATE",
                [bookingId]
            );
            const currentDetail = detail[0];
            const nextTimeslotId = newTimeslot || currentDetail?.timeslot_id;
            const nextLabId = newLab || currentDetail?.lab_id;
            if (!nextLabId || !nextTimeslotId) throw new Error("INVALID_LAB");
            await ensureLabAvailability(connection, nextLabId, newDate, nextTimeslotId, bookingId);
            await connection.execute("UPDATE bookings SET booking_date = ? WHERE booking_id = ?", [newDate, bookingId]);
            await connection.execute(
                "UPDATE lab_bookings SET lab_id = ?, booking_date = ?, timeslot_id = ? WHERE booking_id = ?",
                [nextLabId, newDate, nextTimeslotId, bookingId]
            );
        } else if (existing.booking_type === "equipment") {
            const newDate = payload.bookingDate || existing.booking_date;
            const newEquipment = payload.equipmentId || existing.equipment?.id;
            const newQuantity = payload.quantity || existing.equipment?.quantity;
            await ensureEquipmentAvailability(connection, newEquipment, newDate, newQuantity, bookingId);
            await connection.execute(
                "UPDATE bookings SET booking_date = ? WHERE booking_id = ?",
                [newDate, bookingId]
            );
            await connection.execute(
                "UPDATE equipment_bookings SET equipment_id = ?, booking_date = ?, quantity = ? WHERE booking_id = ?",
                [newEquipment, newDate, newQuantity, bookingId]
            );
        }

        await connection.commit();
        return getBookingById(bookingId);
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function deleteBooking(bookingId, user) {
    const existing = await getBookingById(bookingId);
    if (!existing) return false;
    const allowed = await ensureOwnership(existing, user);
    if (!allowed) return "FORBIDDEN";

    await db.execute("DELETE FROM bookings WHERE booking_id = ?", [bookingId]);
    return true;
}

async function deleteBookingsForResource(type, resourceId, connection = db) {
    if (type === "room") {
        const [rows] = await connection.execute(
            "SELECT booking_id FROM room_bookings WHERE room_id = ?",
            [resourceId]
        );
        const ids = rows.map((r) => r.booking_id);
        if (ids.length) {
            await connection.execute("DELETE FROM bookings WHERE booking_id IN (?)", [ids]);
        }
    } else if (type === "lab") {
        const [rows] = await connection.execute("SELECT booking_id FROM lab_bookings WHERE lab_id = ?", [resourceId]);
        const ids = rows.map((r) => r.booking_id);
        if (ids.length) {
            await connection.execute("DELETE FROM bookings WHERE booking_id IN (?)", [ids]);
        }
    } else if (type === "equipment") {
        const [rows] = await connection.execute(
            "SELECT booking_id FROM equipment_bookings WHERE equipment_id = ?",
            [resourceId]
        );
        const ids = rows.map((r) => r.booking_id);
        if (ids.length) {
            await connection.execute("DELETE FROM bookings WHERE booking_id IN (?)", [ids]);
        }
    }
}

async function listTimeslots() {
    await ensureTimeslotSeeds();
    const [rows] = await db.execute("SELECT * FROM timeslots ORDER BY start_time");
    return rows;
}

async function createTimeslot({ label, start_time, end_time }) {
    if (!label || !start_time || !end_time) throw new Error("MISSING_FIELDS");
    const [result] = await db.execute(
        "INSERT INTO timeslots (label, start_time, end_time) VALUES (?, ?, ?)",
        [label, start_time, end_time]
    );
    return getTimeslotById(result.insertId);
}

async function attachTimeslot(resourceType, resourceId, timeslotId) {
    await ensureTimeslotSeeds();
    const slot = await getTimeslotById(timeslotId);
    if (!slot) throw new Error("INVALID_TIMESLOT");
    if (resourceType === "room") {
        await db.execute(
            "INSERT IGNORE INTO room_timeslots (room_id, timeslot_id) VALUES (?, ?)",
            [resourceId, timeslotId]
        );
    } else if (resourceType === "lab") {
        await db.execute(
            "INSERT IGNORE INTO lab_timeslots (lab_id, timeslot_id) VALUES (?, ?)",
            [resourceId, timeslotId]
        );
    }
    return slot;
}

async function detachTimeslot(resourceType, resourceId, timeslotId) {
    if (resourceType === "room") {
        await db.execute("DELETE FROM room_timeslots WHERE room_id = ? AND timeslot_id = ?", [resourceId, timeslotId]);
        await db.execute(
            `DELETE b FROM bookings b
             JOIN room_bookings rb ON rb.booking_id = b.booking_id
            WHERE rb.room_id = ? AND rb.timeslot_id = ? AND b.booking_date >= CURDATE()`,
            [resourceId, timeslotId]
        );
    } else if (resourceType === "lab") {
        await db.execute("DELETE FROM lab_timeslots WHERE lab_id = ? AND timeslot_id = ?", [resourceId, timeslotId]);
        await db.execute(
            `DELETE b FROM bookings b
             JOIN lab_bookings lb ON lb.booking_id = b.booking_id
            WHERE lb.lab_id = ? AND lb.timeslot_id = ? AND b.booking_date >= CURDATE()`,
            [resourceId, timeslotId]
        );
    }
}

module.exports = {
    createBooking,
    getAllBookings,
    getBookingsForUser,
    getRoomAvailability,
    getLabAvailability,
    updateBooking,
    deleteBooking,
    deleteBookingsForResource,
    listTimeslots,
    createTimeslot,
    attachTimeslot,
    detachTimeslot,
    getResourceTimeslots,
};
