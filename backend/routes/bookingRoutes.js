const express = require("express");
const bookingController = require("../controllers/bookingController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Availability lookup for room and lab bookings
router.get("/availability/rooms/:id", bookingController.getRoomAvailability);
router.get("/availability/labs/:id", bookingController.getLabAvailability);

// Create bookings as a signed-in user
router.post("/", bookingController.createBooking);

// Logged-in users can see their own bookings
router.get("/mine", bookingController.getMyBookings);

// Logged-in users can see their own bookings
router.get("/mine", authenticate, bookingController.getMyBookings);

// Logged-in users can see their own bookings
router.get("/mine", authenticate, bookingController.getMyBookings);

// Updates/deletes enforce ownership rules inside the controller
router.put("/:id", authenticate, bookingController.updateBooking);
router.delete("/:id", authenticate, bookingController.deleteBooking);

// Admin-only list of all bookings
router.get("/", authenticate, requireAdmin, bookingController.listBookings);

module.exports = router;
