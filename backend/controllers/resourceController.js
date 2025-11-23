const Resource = require("../models/resourceModel");
const Schedule = require("../models/scheduleModel");
const Blackout = require("../models/blackoutModel");

async function mapResourceWithDetails(resource) {
    const [hours, exceptions, blackouts, usage] = await Promise.all([
        Schedule.getWorkingHours(resource.resource_id),
        Schedule.listExceptions(resource.resource_id),
        Blackout.listBlackouts(resource.resource_id),
        Resource.getUsageStats(resource),
    ]);

    return {
        ...resource,
        availability: hours || null,
        exceptions,
        blackouts,
        usage,
    };
}

async function getResources(req, res) {
    try {
        const resources = await Resource.getAllResources();
        const detailed = await Promise.all(resources.map((resource) => mapResourceWithDetails(resource)));
        return res.json(detailed);
    } catch (err) {
        console.error("Failed to load resources", err);
        return res.status(500).json({ message: "Failed to load resources" });
    }
}

async function getResource(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const detailed = await mapResourceWithDetails(resource);
        return res.json(detailed);
    } catch (err) {
        console.error("Failed to load resource", err);
        return res.status(500).json({ message: "Failed to load resource" });
    }
}

async function createResource(req, res) {
    try {
        const { name, description, location, capacity, type, image_url } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        const resource = await Resource.createResource({ name, description, location, capacity, type, image_url });
        const detailed = await mapResourceWithDetails(resource);
        return res.status(201).json(detailed);
    } catch (err) {
        console.error("Failed to create resource", err);
        return res.status(500).json({ message: "Failed to create resource" });
    }
}

async function updateResource(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const { name, description, location, capacity, type, image_url } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        const updated = await Resource.updateResource(resource.resource_id, {
            name,
            description,
            location,
            capacity,
            type,
            image_url,
        });
        const detailed = await mapResourceWithDetails(updated);
        return res.json(detailed);
    } catch (err) {
        console.error("Failed to update resource", err);
        return res.status(500).json({ message: "Failed to update resource" });
    }
}

async function deleteResource(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        await Resource.deleteResource(resource.resource_id);
        return res.status(204).send();
    } catch (err) {
        console.error("Failed to delete resource", err);
        return res.status(500).json({ message: "Failed to delete resource" });
    }
}

async function getUsage(req, res) {
    try {
        const resource = await Resource.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const usage = await Resource.getUsageStats(resource);
        return res.json(usage);
    } catch (err) {
        console.error("Failed to load usage stats", err);
        return res.status(500).json({ message: "Failed to load usage" });
    }
}

module.exports = {
    getResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    getUsage,
};
