const Resource = require("../models/resourceModel");
const Blackout = require("../models/blackoutModel");

async function listBlackouts(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const blackouts = await Blackout.listBlackouts(resource.resource_id);
        return res.json({ blackouts });
    } catch (err) {
        console.error("Failed to load blackout periods", err);
        return res.status(500).json({ message: "Failed to load blackouts" });
    }
}

async function addBlackout(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const { blackout_date, reason } = req.body;
        if (!blackout_date) {
            return res.status(400).json({ message: "Blackout date is required" });
        }

        const blackouts = await Blackout.addBlackout(resource.resource_id, blackout_date, reason);
        return res.status(201).json({ blackouts });
    } catch (err) {
        console.error("Failed to add blackout", err);
        return res.status(500).json({ message: "Failed to add blackout" });
    }
}

async function deleteBlackout(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const blackouts = await Blackout.deleteBlackout(resource.resource_id, req.params.blackoutId);
        return res.json({ blackouts });
    } catch (err) {
        console.error("Failed to delete blackout", err);
        return res.status(500).json({ message: "Failed to delete blackout" });
    }
}

module.exports = {
    listBlackouts,
    addBlackout,
    deleteBlackout,
};
