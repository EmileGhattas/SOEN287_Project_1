const express = require("express");
const bookingController = require("../controllers/bookingController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Create bookings as a signed-in user
router.post("/", authenticate, bookingController.createBooking);

// Admin-only management endpoints
router.use(authenticate, requireAdmin);

router.get("/", bookingController.listBookings);
router.put("/:id", bookingController.updateBooking);
router.delete("/:id", bookingController.deleteBooking);

module.exports = router;
