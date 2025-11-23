const express = require("express");
const bookingController = require("../controllers/bookingController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

// Create bookings as a signed-in user
router.post("/", bookingController.createBooking);

// Logged-in users can see their own bookings
router.get("/mine", bookingController.getMyBookings);

// Admin-only list of all bookings
router.get("/", requireAdmin, bookingController.listBookings);

// Updates/deletes enforce ownership rules inside the controller
router.put("/:id", bookingController.updateBooking);
router.delete("/:id", bookingController.deleteBooking);

module.exports = router;
