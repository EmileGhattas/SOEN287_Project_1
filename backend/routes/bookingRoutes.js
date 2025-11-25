const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/availability/:id', bookingController.getAvailability);
router.get('/rooms', bookingController.listRooms);
router.get('/labs', bookingController.listLabs);
router.get('/equipment', bookingController.listEquipment);

router.post('/', authenticate, bookingController.createBooking);
router.get('/mine', authenticate, bookingController.getMyBookings);
router.post('/:id/reschedule', authenticate, bookingController.rescheduleBooking);
router.put('/:id/reschedule', authenticate, bookingController.rescheduleBooking);
router.put('/:id', authenticate, bookingController.updateBooking);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);
router.delete('/:id', authenticate, bookingController.cancelBooking);
router.get('/', authenticate, requireAdmin, bookingController.listBookings);

module.exports = router;
