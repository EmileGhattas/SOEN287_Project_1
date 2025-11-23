const express = require("express");
const resourceController = require("../controllers/resourceController");
const scheduleController = require("../controllers/scheduleController");
const blackoutController = require("../controllers/blackoutController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/", resourceController.getResources);
router.post("/", resourceController.createResource);
router.get("/:id", resourceController.getResource);
router.put("/:id", resourceController.updateResource);
router.delete("/:id", resourceController.deleteResource);
router.get("/:id/usage", resourceController.getUsage);

router.get("/:id/schedule", scheduleController.getSchedule);
router.put("/:id/schedule", scheduleController.updateHours);
router.post("/:id/schedule/exceptions", scheduleController.addException);
router.delete("/:id/schedule/exceptions/:exceptionId", scheduleController.deleteException);

router.get("/:id/blackouts", blackoutController.listBlackouts);
router.post("/:id/blackouts", blackoutController.addBlackout);
router.delete("/:id/blackouts/:blackoutId", blackoutController.deleteBlackout);

module.exports = router;
