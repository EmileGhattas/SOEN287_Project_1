const Booking = require("../models/bookingModel");

async function createBooking(req, res) {
    try {
        const created = await Booking.createBooking(req.body || {}, req.user);
        return res.status(201).json(created);
    } catch (err) {
        if (err.message === "MISSING_FIELDS") {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ message: "User not found" });
        }
        if (err.message === "ROOM_NOT_FOUND" || err.message === "LAB_NOT_FOUND" || err.message === "EQUIPMENT_NOT_FOUND") {
            return res.status(404).json({ message: "Selected resource not found" });
        }
        if (err.message === "ROOM_CONFLICT" || err.message === "LAB_CONFLICT" || err.message === "EQUIPMENT_UNAVAILABLE") {
            return res.status(409).json({ message: "Requested time or quantity is not available" });
        }
        if (err.message.startsWith("INVALID_")) {
            return res.status(400).json({ message: "Invalid booking data" });
        }

        console.error("Failed to create booking", err);
        return res.status(500).json({ message: "Failed to create booking" });
    }
}

async function listBookings(req, res) {
    try {
        const bookings = await Booking.getAllBookings();
        return res.json(bookings);
    } catch (err) {
        console.error("Failed to load bookings", err);
        return res.status(500).json({ message: "Failed to load bookings" });
    }
}

async function getMyBookings(req, res) {
    try {
        const bookings = await Booking.getBookingsForUser(req.user);
        return res.json(bookings);
    } catch (err) {
        console.error("Failed to load user bookings", err);
        return res.status(500).json({ message: "Failed to load bookings" });
    }
}

async function getRoomAvailability(req, res) {
    try {
        const availability = await Booking.getRoomAvailability(
            req.params.id,
            req.query.date,
            req.query.name
        );
        return res.json(availability);
    } catch (err) {
        if (err.message === "ROOM_NOT_FOUND") {
            return res.status(404).json({ message: "Room not found" });
        }
        if (err.message === "MISSING_FIELDS" || err.message.startsWith("INVALID_")) {
            return res.status(400).json({ message: "Invalid booking data" });
        }

        console.error("Failed to load room availability", err);
        return res.status(500).json({ message: "Failed to load availability" });
    }
}

async function getLabAvailability(req, res) {
    try {
        const availability = await Booking.getLabAvailability(req.params.id, req.query.date, req.query.name);
        return res.json(availability);
    } catch (err) {
        if (err.message === "LAB_NOT_FOUND") {
            return res.status(404).json({ message: "Lab not found" });
        }
        if (err.message === "MISSING_FIELDS" || err.message.startsWith("INVALID_")) {
            return res.status(400).json({ message: "Invalid booking data" });
        }

        console.error("Failed to load lab availability", err);
        return res.status(500).json({ message: "Failed to load availability" });
    }
}

async function updateBooking(req, res) {
    try {
        const updated = await Booking.updateBooking(req.params.id, req.body || {}, req.user);
        return res.json(updated);
    } catch (err) {
        if (err.message === "NOT_FOUND") {
            return res.status(404).json({ message: "Booking not found" });
        }
        if (err.message === "FORBIDDEN") {
            return res.status(403).json({ message: "Not allowed to modify this booking" });
        }
        if (err.message && err.message.startsWith("INVALID_")) {
            return res.status(400).json({ message: "Invalid booking data" });
        }
        if (err.message === "ROOM_CONFLICT" || err.message === "LAB_CONFLICT" || err.message === "EQUIPMENT_UNAVAILABLE") {
            return res.status(409).json({ message: "Requested time or quantity is not available" });
        }

        console.error("Failed to update booking", err);
        return res.status(500).json({ message: "Failed to update booking" });
    }
}

async function deleteBooking(req, res) {
    try {
        const removed = await Booking.deleteBooking(req.params.id, req.user);
        if (!removed) {
            return res.status(404).json({ message: "Booking not found" });
        }
        if (removed === "FORBIDDEN") {
            return res.status(403).json({ message: "Not allowed to cancel this booking" });
        }
        return res.status(204).send();
    } catch (err) {
        console.error("Failed to delete booking", err);
        return res.status(500).json({ message: "Failed to delete booking" });
    }
}

module.exports = {
    createBooking,
    listBookings,
    getMyBookings,
    getRoomAvailability,
    getLabAvailability,
    updateBooking,
    deleteBooking,
};
