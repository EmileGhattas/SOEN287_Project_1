const Booking = require("../models/bookingModel");

async function createBooking(req, res) {
    try {
        const created = await Booking.createBooking(req.body || {});
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

async function updateBooking(req, res) {
    try {
        const updated = await Booking.updateBooking(req.params.id, req.body || {});
        return res.json(updated);
    } catch (err) {
        if (err.message === "NOT_FOUND") {
            return res.status(404).json({ message: "Booking not found" });
        }
        if (err.message && err.message.startsWith("INVALID_")) {
            return res.status(400).json({ message: "Invalid booking data" });
        }

        console.error("Failed to update booking", err);
        return res.status(500).json({ message: "Failed to update booking" });
    }
}

async function deleteBooking(req, res) {
    try {
        const removed = await Booking.deleteBooking(req.params.id);
        if (!removed) {
            return res.status(404).json({ message: "Booking not found" });
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
    updateBooking,
    deleteBooking,
};
