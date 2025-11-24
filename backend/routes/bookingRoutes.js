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
router.put('/:id', authenticate, bookingController.updateBooking);
router.delete('/:id', authenticate, bookingController.deleteBooking);
router.get('/', authenticate, requireAdmin, bookingController.listBookings);

module.exports = router;
