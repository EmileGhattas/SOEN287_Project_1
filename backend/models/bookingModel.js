const db = require("../db/db");

function mapRow(row) {
    return {
        booking_id: row.booking_id,
        booking_type: row.booking_type,
        booking_date: row.booking_date,
        user_id: row.user_id,
        user_name: row.username,
        user_email: row.email,
        room: row.booking_type === "room"
            ? {
                  id: row.room_id,
                  name: row.room_name,
                  start_time: row.start_time,
                  end_time: row.end_time,
              }
            : null,
        lab: row.booking_type === "lab"
            ? {
                  id: row.lab_id,
                  name: row.lab_name,
                  time_slot: row.time_slot,
              }
            : null,
        equipment: row.booking_type === "equipment"
            ? {
                  id: row.equipment_id,
                  name: row.equipment_name,
                  quantity: row.quantity,
              }
            : null,
    };
}

const BASE_QUERY = `
    SELECT b.booking_id, b.booking_type, b.booking_date, b.user_id, u.username, u.email,
           rb.room_id, r.name AS room_name, rb.start_time, rb.end_time,
           lb.lab_id, l.name AS lab_name, lb.time_slot,
           eb.equipment_id, e.name AS equipment_name, eb.quantity
      FROM bookings b
      JOIN users u ON u.user_id = b.user_id
      LEFT JOIN room_bookings rb ON rb.booking_id = b.booking_id
      LEFT JOIN rooms r ON r.room_id = rb.room_id
      LEFT JOIN lab_bookings lb ON lb.booking_id = b.booking_id
      LEFT JOIN labs l ON l.lab_id = lb.lab_id
      LEFT JOIN equipment_bookings eb ON eb.booking_id = b.booking_id
      LEFT JOIN equipment e ON e.equipment_id = eb.equipment_id`;

async function getAllBookings() {
    const [rows] = await db.query(`${BASE_QUERY} ORDER BY b.booking_date DESC, b.booking_id DESC`);
    return rows.map(mapRow);
}

async function getBookingsForUser(user) {
    if (!user?.user_id) {
        return [];
    }
    const [rows] = await db.execute(
        `${BASE_QUERY} WHERE b.user_id = ? ORDER BY b.booking_date DESC, b.booking_id DESC`,
        [user.user_id]
    );
    return rows.map(mapRow);
}

async function getRoomAvailability(roomId, date) {
    if (!roomId || !date) {
        throw new Error("MISSING_FIELDS");
    }

    const [roomRows] = await db.execute("SELECT room_id FROM rooms WHERE room_id = ?", [roomId]);
    if (!roomRows.length) {
        throw new Error("ROOM_NOT_FOUND");
    }

    const [bookings] = await db.execute(
        `SELECT rb.start_time, rb.end_time
           FROM room_bookings rb
           JOIN bookings b ON b.booking_id = rb.booking_id
          WHERE rb.room_id = ? AND b.booking_date = ?
          ORDER BY rb.start_time`,
        [roomId, date]
    );

    const timeOptions = [];
    for (let h = 7; h <= 23; h++) {
        timeOptions.push(`${String(h).padStart(2, "0")}:00`);
        timeOptions.push(`${String(h).padStart(2, "0")}:30`);
    }

    const blocked = new Set();
    bookings.forEach(({ start_time, end_time }) => {
        const start = timeToMinutes(start_time);
        const end = timeToMinutes(end_time);
        for (let m = start; m < end; m += 30) {
            blocked.add(minutesToString(m));
        }
    });

    const availableTimes = timeOptions.filter((t) => !blocked.has(t));

    return {
        availableTimes,
        booked: bookings.map((b) => ({
            start_time: b.start_time,
            end_time: b.end_time,
        })),
    };
}

async function getBookingById(bookingId, connection = null) {
    const executor = connection || db;
    const [rows] = await executor.execute(`${BASE_QUERY} WHERE b.booking_id = ? LIMIT 1`, [bookingId]);
    return rows[0] ? mapRow(rows[0]) : null;
}

function normalizeTime(value) {
    if (!value) return value;
    if (value.length === 5) return `${value}:00`;
    return value;
}

function timeToMinutes(timeValue) {
    if (!timeValue) return 0;
    const [hour, minute] = timeValue.split(":");
    return Number(hour) * 60 + Number(minute || 0);
}

function minutesToString(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${minutes === 0 ? "00" : "30"}`;
}

async function ensureRoomAvailability(connection, roomId, date, startTime, endTime, excludeId = null) {
    const params = [roomId, date, startTime, endTime];
    let query = `SELECT rb.rm_booking_id
                   FROM room_bookings rb
                   JOIN bookings b ON b.booking_id = rb.booking_id
                  WHERE rb.room_id = ? AND b.booking_date = ?
                    AND NOT (rb.end_time <= ? OR rb.start_time >= ?)`;
    if (excludeId) {
        query += " AND b.booking_id <> ?";
        params.push(excludeId);
    }

    const [conflict] = await connection.execute(query + " LIMIT 1", params);
    if (conflict.length) {
        throw new Error("ROOM_CONFLICT");
    }
}

async function ensureLabAvailability(connection, labId, date, timeSlot, excludeId = null) {
    const params = [labId, timeSlot, date];
    let query = `SELECT lb.id
                   FROM lab_bookings lb
                   JOIN bookings b ON b.booking_id = lb.booking_id
                  WHERE lb.lab_id = ? AND lb.time_slot = ? AND b.booking_date = ?`;
    if (excludeId) {
        query += " AND b.booking_id <> ?";
        params.push(excludeId);
    }

    const [conflict] = await connection.execute(query + " LIMIT 1", params);
    if (conflict.length) {
        throw new Error("LAB_CONFLICT");
    }
}

async function ensureEquipmentAvailability(connection, equipmentId, date, quantity, excludeId = null) {
    const [equipRows] = await connection.execute(
        "SELECT equipment_id, total_quantity, available_quantity FROM equipment WHERE equipment_id = ? FOR UPDATE",
        [equipmentId]
    );

    if (!equipRows.length) {
        throw new Error("EQUIPMENT_NOT_FOUND");
    }

    const equipment = equipRows[0];
    const [existingBookings] = await connection.execute(
        `SELECT COALESCE(SUM(eb.quantity), 0) AS total
           FROM equipment_bookings eb
           JOIN bookings b ON b.booking_id = eb.booking_id
          WHERE eb.equipment_id = ? AND b.booking_date = ? ${excludeId ? "AND b.booking_id <> ?" : ""}`,
        excludeId ? [equipmentId, date, excludeId] : [equipmentId, date]
    );

    const alreadyBooked = existingBookings[0]?.total || 0;
    if (alreadyBooked + quantity > equipment.total_quantity) {
        throw new Error("EQUIPMENT_UNAVAILABLE");
    }

    return equipment;
}

async function createBooking(payload, user) {
    const type = payload.bookingType || payload.booking_type || payload.type;
    const date = payload.bookingDate || payload.booking_date || payload.date;
    const userId = user?.user_id;

    if (!type || !userId || !date) {
        throw new Error("MISSING_FIELDS");
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [userRows] = await connection.execute(
            "SELECT user_id FROM users WHERE user_id = ? LIMIT 1",
            [userId]
        );

        if (!userRows.length) {
            throw new Error("USER_NOT_FOUND");
        }

        const [bookingResult] = await connection.execute(
            "INSERT INTO bookings (user_id, booking_type, booking_date) VALUES (?, ?, ?)",
            [userId, type, date]
        );

        const bookingId = bookingResult.insertId;

        if (type === "room") {
            const roomId = payload.roomId || payload.room_id;
            let startTime = normalizeTime(payload.startTime || payload.start_time);
            let endTime = normalizeTime(payload.endTime || payload.end_time);

            if (!roomId || !startTime || !endTime || startTime >= endTime) {
                throw new Error("INVALID_ROOM");
            }

            const [roomRows] = await connection.execute(
                "SELECT room_id FROM rooms WHERE room_id = ? LIMIT 1",
                [roomId]
            );

            if (!roomRows.length) {
                throw new Error("ROOM_NOT_FOUND");
            }

            await ensureRoomAvailability(connection, roomId, date, startTime, endTime);

            await connection.execute(
                "INSERT INTO room_bookings (booking_id, room_id, start_time, end_time) VALUES (?, ?, ?, ?)",
                [bookingId, roomId, startTime, endTime]
            );
        } else if (type === "lab") {
            const labId = payload.labId || payload.lab_id;
            const slot = payload.timeSlot || payload.time_slot || payload.slot;

            if (!labId || !slot) {
                throw new Error("INVALID_LAB");
            }

            const [labRows] = await connection.execute(
                "SELECT lab_id FROM labs WHERE lab_id = ? LIMIT 1",
                [labId]
            );

            if (!labRows.length) {
                throw new Error("LAB_NOT_FOUND");
            }

            await ensureLabAvailability(connection, labId, date, slot);

            await connection.execute(
                "INSERT INTO lab_bookings (booking_id, lab_id, time_slot) VALUES (?, ?, ?)",
                [bookingId, labId, slot]
            );
        } else if (type === "equipment") {
            const equipmentId = payload.equipmentId || payload.equipment_id;
            const quantity = payload.quantity ? Number(payload.quantity) : 1;

            if (!equipmentId || quantity < 1) {
                throw new Error("INVALID_EQUIPMENT");
            }

            const equipment = await ensureEquipmentAvailability(connection, equipmentId, date, quantity);

            if (equipment.available_quantity < quantity) {
                throw new Error("EQUIPMENT_UNAVAILABLE");
            }

            await connection.execute(
                "INSERT INTO equipment_bookings (booking_id, equipment_id, quantity) VALUES (?, ?, ?)",
                [bookingId, equipmentId, quantity]
            );

            await connection.execute(
                "UPDATE equipment SET available_quantity = available_quantity - ? WHERE equipment_id = ?",
                [quantity, equipmentId]
            );
        } else {
            throw new Error("INVALID_TYPE");
        }

        await connection.commit();
        return getBookingById(bookingId, connection);
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function updateBooking(bookingId, payload, currentUser) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [currentRows] = await connection.execute(
            `${BASE_QUERY} WHERE b.booking_id = ? LIMIT 1 FOR UPDATE`,
            [bookingId]
        );
        const current = currentRows[0];
        if (!current) {
            throw new Error("NOT_FOUND");
        }

        if (!currentUser?.is_admin && current.user_id !== currentUser?.user_id) {
            throw new Error("FORBIDDEN");
        }

        const bookingDate = payload.booking_date || payload.bookingDate || current.booking_date;

        await connection.execute(
            "UPDATE bookings SET booking_date = ? WHERE booking_id = ?",
            [bookingDate, bookingId]
        );

        if (current.booking_type === "room") {
            const roomId = payload.room_id || payload.roomId || current.room_id;
            let startTime = normalizeTime(payload.start_time || payload.startTime || current.start_time);
            let endTime = normalizeTime(payload.end_time || payload.endTime || current.end_time);

            if (!roomId || !startTime || !endTime || startTime >= endTime) {
                throw new Error("INVALID_ROOM");
            }

            const [roomRows] = await connection.execute(
                "SELECT room_id FROM rooms WHERE room_id = ? LIMIT 1",
                [roomId]
            );
            if (!roomRows.length) {
                throw new Error("ROOM_NOT_FOUND");
            }

            await ensureRoomAvailability(connection, roomId, bookingDate, startTime, endTime, bookingId);

            await connection.execute(
                "UPDATE room_bookings SET room_id = ?, start_time = ?, end_time = ? WHERE booking_id = ?",
                [roomId, startTime, endTime, bookingId]
            );
        } else if (current.booking_type === "lab") {
            const labId = payload.lab_id || payload.labId || current.lab_id;
            const timeSlot = payload.time_slot || payload.timeSlot || current.time_slot;

            if (!labId || !timeSlot) {
                throw new Error("INVALID_LAB");
            }

            const [labRows] = await connection.execute(
                "SELECT lab_id FROM labs WHERE lab_id = ? LIMIT 1",
                [labId]
            );
            if (!labRows.length) {
                throw new Error("LAB_NOT_FOUND");
            }

            await ensureLabAvailability(connection, labId, bookingDate, timeSlot, bookingId);

            await connection.execute(
                "UPDATE lab_bookings SET lab_id = ?, time_slot = ? WHERE booking_id = ?",
                [labId, timeSlot, bookingId]
            );
        } else if (current.booking_type === "equipment") {
            const newEquipmentId = payload.equipment_id || payload.equipmentId || current.equipment_id;
            const newQuantityRaw = payload.quantity ?? current.quantity;
            const newQuantity = Number(newQuantityRaw);

            if (!newEquipmentId || !newQuantity || newQuantity < 1) {
                throw new Error("INVALID_EQUIPMENT");
            }

            const isSameEquipment = Number(newEquipmentId) === Number(current.equipment_id);

            if (isSameEquipment) {
                const equipment = await ensureEquipmentAvailability(
                    connection,
                    newEquipmentId,
                    bookingDate,
                    newQuantity,
                    bookingId
                );

                const diff = newQuantity - current.quantity;
                if (diff > 0 && equipment.available_quantity < diff) {
                    throw new Error("EQUIPMENT_UNAVAILABLE");
                }

                await connection.execute(
                    "UPDATE equipment SET available_quantity = available_quantity - ? WHERE equipment_id = ?",
                    [diff, newEquipmentId]
                );
            } else {
                const oldEquipmentId = current.equipment_id;
                const [oldRows] = await connection.execute(
                    "SELECT equipment_id FROM equipment WHERE equipment_id = ? FOR UPDATE",
                    [oldEquipmentId]
                );
                if (!oldRows.length) {
                    throw new Error("EQUIPMENT_NOT_FOUND");
                }

                const newEquipment = await ensureEquipmentAvailability(
                    connection,
                    newEquipmentId,
                    bookingDate,
                    newQuantity,
                    bookingId
                );

                if (newEquipment.available_quantity < newQuantity) {
                    throw new Error("EQUIPMENT_UNAVAILABLE");
                }

                await connection.execute(
                    "UPDATE equipment SET available_quantity = available_quantity + ? WHERE equipment_id = ?",
                    [current.quantity, oldEquipmentId]
                );
                await connection.execute(
                    "UPDATE equipment SET available_quantity = available_quantity - ? WHERE equipment_id = ?",
                    [newQuantity, newEquipmentId]
                );
            }

            await connection.execute(
                "UPDATE equipment_bookings SET equipment_id = ?, quantity = ? WHERE booking_id = ?",
                [newEquipmentId, newQuantity, bookingId]
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

async function deleteBooking(bookingId, currentUser) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [currentRows] = await connection.execute(
            `${BASE_QUERY} WHERE b.booking_id = ? LIMIT 1 FOR UPDATE`,
            [bookingId]
        );
        const current = currentRows[0];
        if (!current) {
            return false;
        }

        if (!currentUser?.is_admin && current.user_id !== currentUser?.user_id) {
            await connection.rollback();
            return "FORBIDDEN";
        }

        if (current.booking_type === "equipment" && current.equipment_id) {
            await connection.execute(
                "UPDATE equipment SET available_quantity = available_quantity + ? WHERE equipment_id = ?",
                [current.quantity, current.equipment_id]
            );
        }

        await connection.execute("DELETE FROM bookings WHERE booking_id = ?", [bookingId]);

        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function deleteBookingsForResource(type, resourceId, connection = null) {
    if (!resourceId) return;
    const executor = connection || db;
    let bookingIds = [];

    if (type === "room") {
        const [rows] = await executor.execute(
            "SELECT booking_id FROM room_bookings WHERE room_id = ?",
            [resourceId]
        );
        bookingIds = rows.map((r) => r.booking_id);
    } else if (type === "lab") {
        const [rows] = await executor.execute(
            "SELECT booking_id FROM lab_bookings WHERE lab_id = ?",
            [resourceId]
        );
        bookingIds = rows.map((r) => r.booking_id);
    } else if (type === "equipment") {
        const [rows] = await executor.execute(
            "SELECT booking_id, quantity, equipment_id FROM equipment_bookings WHERE equipment_id = ?",
            [resourceId]
        );
        for (const row of rows) {
            await executor.execute(
                "UPDATE equipment SET available_quantity = available_quantity + ? WHERE equipment_id = ?",
                [row.quantity, row.equipment_id]
            );
        }
        bookingIds = rows.map((r) => r.booking_id);
    }

    if (bookingIds.length) {
        const placeholders = bookingIds.map(() => "?").join(", ");
        await executor.execute(`DELETE FROM bookings WHERE booking_id IN (${placeholders})`, bookingIds);
    }
}

module.exports = {
    getAllBookings,
    getBookingsForUser,
    getRoomAvailability,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    deleteBookingsForResource,
};
