const Booking = require("../models/bookingModel");

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
    listBookings,
    updateBooking,
    deleteBooking,
};
