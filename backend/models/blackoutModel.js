const db = require("../db/db");

async function ensureTables() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS blackout_periods (
            blackout_id INT AUTO_INCREMENT PRIMARY KEY,
            resource_id INT NOT NULL,
            blackout_date DATE NOT NULL,
            reason VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY resource_blackout_unique (resource_id, blackout_date),
            CONSTRAINT fk_blackout_resource FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE
        )
    `);
}

async function listBlackouts(resourceId) {
    const [rows] = await db.execute(
        "SELECT blackout_id, blackout_date, reason FROM blackout_periods WHERE resource_id = ? ORDER BY blackout_date",
        [resourceId]
    );
    return rows;
}

async function addBlackout(resourceId, blackoutDate, reason) {
    await db.execute(
        `INSERT INTO blackout_periods (resource_id, blackout_date, reason)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
        [resourceId, blackoutDate, reason || null]
    );
    return listBlackouts(resourceId);
}

async function deleteBlackout(resourceId, blackoutId) {
    await db.execute(
        "DELETE FROM blackout_periods WHERE blackout_id = ? AND resource_id = ?",
        [blackoutId, resourceId]
    );
    return listBlackouts(resourceId);
}

ensureTables().catch((err) => {
    console.error("Failed to ensure blackout table exists", err);
});

module.exports = {
    listBlackouts,
    addBlackout,
    deleteBlackout,
};
