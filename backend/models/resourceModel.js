const db = require("../db/db");

async function ensureTables() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS resources (
            resource_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            location VARCHAR(255),
            capacity INT,
            type VARCHAR(100),
            image_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function getAllResources() {
    const [rows] = await db.execute("SELECT * FROM resources ORDER BY name");
    return rows;
}

async function getResourceById(resourceId) {
    const [rows] = await db.execute("SELECT * FROM resources WHERE resource_id = ?", [resourceId]);
    return rows[0];
}

async function createResource({ name, description, location, capacity, type, image_url }) {
    const [result] = await db.execute(
        "INSERT INTO resources (name, description, location, capacity, type, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        [name, description || null, location || null, capacity || null, type || null, image_url || null]
    );

    return getResourceById(result.insertId);
}

async function updateResource(resourceId, { name, description, location, capacity, type, image_url }) {
    await db.execute(
        `UPDATE resources
         SET name = ?, description = ?, location = ?, capacity = ?, type = ?, image_url = ?
         WHERE resource_id = ?`,
        [name, description || null, location || null, capacity || null, type || null, image_url || null, resourceId]
    );

    return getResourceById(resourceId);
}

async function deleteResource(resourceId) {
    await db.execute("DELETE FROM resources WHERE resource_id = ?", [resourceId]);
}

async function bookingsTableExists() {
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'`
    );

    return rows[0]?.total > 0;
}

async function hasBookingResourceColumn() {
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'resource_id'`
    );

    return rows[0]?.total > 0;
}

async function getUsageStats(resource) {
    const [blackouts] = await db.execute(
        "SELECT COUNT(*) AS total FROM blackout_periods WHERE resource_id = ?",
        [resource.resource_id]
    );

    const [exceptions] = await db.execute(
        "SELECT COUNT(*) AS total FROM resource_exceptions WHERE resource_id = ?",
        [resource.resource_id]
    );

    let bookingCount = 0;
    const tableExists = await bookingsTableExists();

    if (tableExists) {
        const bookingHasColumn = await hasBookingResourceColumn();

        if (bookingHasColumn) {
            const [byResource] = await db.execute(
                "SELECT COUNT(*) AS total FROM bookings WHERE resource_id = ?",
                [resource.resource_id]
            );
            bookingCount = byResource[0]?.total || 0;
        } else {
            const [byName] = await db.execute(
                "SELECT COUNT(*) AS total FROM bookings WHERE booking_type = ?",
                [resource.name]
            );
            bookingCount = byName[0]?.total || 0;
        }
    }

    return {
        bookings: bookingCount,
        blackoutDays: blackouts[0]?.total || 0,
        exceptions: exceptions[0]?.total || 0,
    };
}

ensureTables().catch((err) => {
    console.error("Failed to ensure resources table exists", err);
});

module.exports = {
    getAllResources,
    getResourceById,
    createResource,
    updateResource,
    deleteResource,
    getUsageStats,
};
