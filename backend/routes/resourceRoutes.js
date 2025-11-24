const express = require('express');
const resourceController = require('../controllers/resourceController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/usage/summary', authenticate, requireAdmin, resourceController.getUsage);
router.get('/', resourceController.getResources);
router.get('/:id', resourceController.getResource);
router.get('/:id/availability', resourceController.getAvailability);
router.get('/:id/blackouts', authenticate, requireAdmin, resourceController.listBlackouts);
router.post('/:id/blackouts', authenticate, requireAdmin, resourceController.addBlackout);
router.delete('/:id/blackouts/:blackoutId', authenticate, requireAdmin, resourceController.deleteBlackout);

router.post('/', authenticate, requireAdmin, resourceController.createResource);
router.put('/:id', authenticate, requireAdmin, resourceController.updateResource);
router.delete('/:id', authenticate, requireAdmin, resourceController.deleteResource);
router.get('/:id/usage', authenticate, requireAdmin, resourceController.getUsage);

module.exports = router;
