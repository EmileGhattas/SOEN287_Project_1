const Resource = require('../models/resourceModel');
const Booking = require('../models/bookingModel');

function normalizeCapacityQuantity(payload = {}) {
  const type = payload.type;
  if (type === 'equipment') {
    const quantity = payload.quantity === undefined || payload.quantity === '' ? null : Number(payload.quantity);
    return { ...payload, capacity: null, quantity: Number.isNaN(quantity) ? null : quantity };
  }
  if (type === 'room' || type === 'lab') {
    const capacity = payload.capacity === undefined || payload.capacity === '' ? null : Number(payload.capacity);
    return { ...payload, quantity: null, capacity: Number.isNaN(capacity) ? null : capacity };
  }
  return payload;
}

function normalizeImagePathField(body) {
  const raw = body?.image_path ?? body?.image_url;
  if (raw === undefined) return { image_path: undefined, error: null };
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return { image_path: '', error: null };
  if (trimmed.startsWith('/assets/')) return { image_path: trimmed, error: null };
  if (/^https?:\/\//i.test(trimmed)) return { image_path: trimmed, error: null };
  return { image_path: null, error: 'Invalid image path. Use /assets/... or a full URL.' };
}

async function getResources(_req, res) {
  try {
    const resources = await Resource.listResources();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load resources' });
  }
}

async function getResource(req, res) {
  const [resource] = await Resource.listResources('WHERE r.id = ?', [req.params.id]);
  if (!resource) return res.status(404).json({ message: 'Resource not found' });
  res.json(resource);
}

async function createResource(req, res) {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'Name and type are required' });
    const { image_path, error } = normalizeImagePathField(req.body);
    if (error) return res.status(400).json({ message: error });
    const sanitized = normalizeCapacityQuantity({ ...req.body, image_path });
    const resource = await Resource.createResource(sanitized);
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create resource' });
  }
}

async function updateResource(req, res) {
  try {
    const { image_path, error } = normalizeImagePathField(req.body);
    if (error) return res.status(400).json({ message: error });
    const sanitized = normalizeCapacityQuantity({ ...req.body, image_path });
    const updated = await Resource.updateResource(req.params.id, sanitized);
    res.json(updated);
  } catch (err) {
    const status = err.message === 'NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: 'Failed to update resource' });
  }
}

async function deleteResource(req, res) {
  try {
    await Resource.deleteResource(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete resource' });
  }
}

async function getUsage(_req, res) {
  try {
    const stats = await Resource.resourceStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load usage' });
  }
}

async function getAvailability(req, res) {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const availability = await Booking.getAvailability(id, date);
    res.json(availability);
  } catch (err) {
    res.status(400).json({ message: 'Failed to load availability' });
  }
}

async function listBlackouts(req, res) {
  try {
    const blackouts = await Resource.listBlackouts(req.params.id);
    res.json(blackouts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load blackouts' });
  }
}

async function addBlackout(req, res) {
  try {
    const { blackout_date, reason } = req.body;
    if (!blackout_date) return res.status(400).json({ message: 'Blackout date required' });
    const blackouts = await Resource.addBlackout(req.params.id, blackout_date, reason);
    res.status(201).json(blackouts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add blackout' });
  }
}

async function deleteBlackout(req, res) {
  try {
    const blackouts = await Resource.deleteBlackout(req.params.id, req.params.blackoutId);
    res.json(blackouts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete blackout' });
  }
}

module.exports = {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  getUsage,
  getAvailability,
  listBlackouts,
  addBlackout,
  deleteBlackout,
};
