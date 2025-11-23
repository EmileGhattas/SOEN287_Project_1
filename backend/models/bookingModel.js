const db = require("../db/db");

async function mapRow(row) {
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

async function getBookingById(bookingId, connection = null) {
    const executor = connection || db;
    const [rows] = await executor.execute(`${BASE_QUERY} WHERE b.booking_id = ? LIMIT 1`, [bookingId]);
    return rows[0] ? mapRow(rows[0]) : null;
}

async function updateBooking(bookingId, payload) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [currentRows] = await connection.execute(`${BASE_QUERY} WHERE b.booking_id = ? LIMIT 1 FOR UPDATE`, [bookingId]);
        const current = currentRows[0];
        if (!current) {
            throw new Error("NOT_FOUND");
        }

        const bookingDate = payload.booking_date || payload.bookingDate || current.booking_date;
        const userId = payload.user_id || payload.userId || current.user_id;

        if (!bookingDate || !userId) {
            throw new Error("INVALID_BOOKING");
        }

        await connection.execute(
            "UPDATE bookings SET user_id = ?, booking_date = ? WHERE booking_id = ?",
            [userId, bookingDate, bookingId]
        );

        if (current.booking_type === "room") {
            const roomId = payload.room_id || payload.roomId || current.room_id;
            let startTime = payload.start_time || payload.startTime || current.start_time;
            let endTime = payload.end_time || payload.endTime || current.end_time;

            if (startTime && startTime.length === 5) startTime += ":00";
            if (endTime && endTime.length === 5) endTime += ":00";

            if (!roomId || !startTime || !endTime || startTime >= endTime) {
                throw new Error("INVALID_ROOM");
            }

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

            await connection.execute(
                "UPDATE lab_bookings SET lab_id = ?, time_slot = ? WHERE booking_id = ?",
                [labId, timeSlot, bookingId]
            );
        } else if (current.booking_type === "equipment") {
            const equipmentId = payload.equipment_id || payload.equipmentId || current.equipment_id;
            const quantity = payload.quantity || current.quantity;

            if (!equipmentId || !quantity || quantity < 1) {
                throw new Error("INVALID_EQUIPMENT");
            }

            await connection.execute(
                "UPDATE equipment_bookings SET equipment_id = ?, quantity = ? WHERE booking_id = ?",
                [equipmentId, quantity, bookingId]
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

async function deleteBooking(bookingId) {
    const [result] = await db.execute("DELETE FROM bookings WHERE booking_id = ?", [bookingId]);
    return result.affectedRows > 0;
}

module.exports = {
    getAllBookings,
    getBookingById,
    updateBooking,
    deleteBooking,
};
