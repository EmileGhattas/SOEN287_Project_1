const Resource = require("../models/resourceModel");
const Schedule = require("../models/scheduleModel");
const Blackout = require("../models/blackoutModel");

async function getSchedule(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const [hours, exceptions, blackouts] = await Promise.all([
            Schedule.getWorkingHours(resource.resource_id),
            Schedule.listExceptions(resource.resource_id),
            Blackout.listBlackouts(resource.resource_id),
        ]);

        return res.json({
            resource,
            hours: hours || null,
            exceptions,
            blackouts,
        });
    } catch (err) {
        console.error("Failed to load schedule", err);
        return res.status(500).json({ message: "Failed to load schedule" });
    }
}

async function updateHours(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const { open_time, close_time } = req.body;
        if (!open_time || !close_time) {
            return res.status(400).json({ message: "Open and close times are required" });
        }

        const hours = await Schedule.setWorkingHours(resource.resource_id, open_time, close_time);
        return res.json({ hours });
    } catch (err) {
        console.error("Failed to update hours", err);
        return res.status(500).json({ message: "Failed to update hours" });
    }
}

async function addException(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const { exception_date, open_time, close_time } = req.body;
        if (!exception_date || !open_time || !close_time) {
            return res.status(400).json({ message: "Exception date, open, and close times are required" });
        }

        const exceptions = await Schedule.upsertException(resource.resource_id, exception_date, open_time, close_time);
        return res.status(201).json({ exceptions });
    } catch (err) {
        console.error("Failed to add exception", err);
        return res.status(500).json({ message: "Failed to add exception" });
    }
}

async function deleteException(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const exceptions = await Schedule.deleteException(resource.resource_id, req.params.exceptionId);
        return res.json({ exceptions });
    } catch (err) {
        console.error("Failed to delete exception", err);
        return res.status(500).json({ message: "Failed to delete exception" });
    }
}

module.exports = {
    getSchedule,
    updateHours,
    addException,
    deleteException,
};
