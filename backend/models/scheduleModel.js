const db = require("../db/db");

async function ensureTables() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS resource_hours (
            hours_id INT AUTO_INCREMENT PRIMARY KEY,
            resource_id INT NOT NULL,
            open_time TIME NOT NULL,
            close_time TIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY hours_resource_unique (resource_id),
            CONSTRAINT fk_hours_resource FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS resource_exceptions (
            exception_id INT AUTO_INCREMENT PRIMARY KEY,
            resource_id INT NOT NULL,
            exception_date DATE NOT NULL,
            open_time TIME NOT NULL,
            close_time TIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY resource_exception_unique (resource_id, exception_date),
            CONSTRAINT fk_exception_resource FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE
        )
    `);
}

async function getWorkingHours(resourceId) {
    const [rows] = await db.execute(
        "SELECT open_time, close_time FROM resource_hours WHERE resource_id = ?",
        [resourceId]
    );
    return rows[0] || null;
}

async function setWorkingHours(resourceId, openTime, closeTime) {
    await db.execute(
        `INSERT INTO resource_hours (resource_id, open_time, close_time)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time)`,
        [resourceId, openTime, closeTime]
    );
    return getWorkingHours(resourceId);
}

async function listExceptions(resourceId) {
    const [rows] = await db.execute(
        "SELECT exception_id, exception_date, open_time, close_time FROM resource_exceptions WHERE resource_id = ? ORDER BY exception_date",
        [resourceId]
    );
    return rows;
}

async function upsertException(resourceId, exceptionDate, openTime, closeTime) {
    await db.execute(
        `INSERT INTO resource_exceptions (resource_id, exception_date, open_time, close_time)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time)`,
        [resourceId, exceptionDate, openTime, closeTime]
    );
    return listExceptions(resourceId);
}

async function deleteException(resourceId, exceptionId) {
    await db.execute(
        "DELETE FROM resource_exceptions WHERE exception_id = ? AND resource_id = ?",
        [exceptionId, resourceId]
    );
    return listExceptions(resourceId);
}

ensureTables().catch((err) => {
    console.error("Failed to ensure schedule tables exist", err);
});

module.exports = {
    getWorkingHours,
    setWorkingHours,
    listExceptions,
    upsertException,
    deleteException,
};
