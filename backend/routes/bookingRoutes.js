const express = require('express');
const bookingController = require('../controllers/bookingController');
const Booking = require('../models/bookingModel');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/availability/:id', bookingController.getAvailability);
router.get('/rooms', bookingController.listRooms);
router.get('/labs', bookingController.listLabs);
router.get('/equipment', bookingController.listEquipment);

router.post('/', authenticate, bookingController.createBooking);
router.get('/mine', authenticate, bookingController.getMyBookings);
router.post('/:id/reschedule', authenticate, async (req, res) => {
  try {
    const updated = await Booking.rescheduleBooking(req.params.id, req.body || {}, req.user);
    res.json(updated);
  } catch (err) {
    const map = {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      RESOURCE_NOT_FOUND: 404,
      ROOM_CONFLICT: 409,
      LAB_CONFLICT: 409,
      EQUIPMENT_UNAVAILABLE: 409,
      INVALID_TIMESLOT: 400,
      INVALID_STATUS: 400,
      RESOURCE_BLACKED_OUT: 409,
      MISSING_FIELDS: 400,
    };
    res.status(map[err.message] || 500).json({ message: 'Failed to reschedule booking' });
  }
});
router.put('/:id', authenticate, bookingController.updateBooking);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);
router.delete('/:id', authenticate, bookingController.cancelBooking);
router.get('/', authenticate, requireAdmin, bookingController.listBookings);

module.exports = router;
