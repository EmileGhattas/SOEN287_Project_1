const Booking = require('../models/bookingModel');
const Resource = require('../models/resourceModel');

exports.createBooking = async (req, res) => {
  try {
    const created = await Booking.createBooking(req.body || {}, req.user);
    return res.status(201).json(created);
  } catch (err) {
    const map = {
      MISSING_FIELDS: 400,
      USER_NOT_FOUND: 404,
      RESOURCE_NOT_FOUND: 404,
      RESOURCE_BLACKED_OUT: 409,
      ROOM_CONFLICT: 409,
      LAB_CONFLICT: 409,
      EQUIPMENT_UNAVAILABLE: 409,
      INVALID_TIMESLOT: 400,
    };
    const status = map[err.message] || 500;
    return res.status(status).json({ message: 'Failed to create booking' });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const bookings = await Booking.listAll();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load bookings' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.listForUser(req.user.id);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load bookings' });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const availability = await Booking.getAvailability(id, date);
    res.json(availability);
  } catch (err) {
    const map = {
      MISSING_FIELDS: 400,
      RESOURCE_NOT_FOUND: 404,
    };
    res.status(map[err.message] || 500).json({ message: 'Failed to load availability' });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const updated = await Booking.updateBooking(req.params.id, req.body || {}, req.user);
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
    };
    res.status(map[err.message] || 500).json({ message: 'Failed to update booking' });
  }
};

exports.rescheduleBooking = async (req, res) => {
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
};

exports.cancelBooking = async (req, res) => {
  try {
    const cancelled = await Booking.cancelBooking(req.params.id, req.user);
    if (!cancelled) return res.status(404).json({ message: 'Booking not found' });
    if (cancelled === 'FORBIDDEN') return res.status(403).json({ message: 'Not allowed' });
    return res.json(cancelled);
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
};

exports.listRooms = async (_req, res) => {
  const all = await Resource.listResources();
  res.json(all.filter((r) => r.type === 'room'));
};

exports.listLabs = async (_req, res) => {
  const all = await Resource.listResources();
  res.json(all.filter((r) => r.type === 'lab'));
};

exports.listEquipment = async (_req, res) => {
  const all = await Resource.listResources();
  res.json(all.filter((r) => r.type === 'equipment'));
};
