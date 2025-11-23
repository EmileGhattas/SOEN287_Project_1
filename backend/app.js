const express = require("express");
const path = require("path");
const app = express();
const db = require("./db/db");
const PORT = 5000;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
const ASSETS_DIR = path.join(__dirname, "..", "assets");

// Import auth routes
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

// Middleware to parse JSON
app.use(express.json());
// Mount authentication routes under /api/auth
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/bookings", bookingRoutes);

// Serve static files from the top-level frontend folder
app.use(express.static(FRONTEND_DIR));
app.use("/assets", express.static(ASSETS_DIR));

function sendFrontendFile(res, relativePath) {
    const filePath = path.join(FRONTEND_DIR, relativePath);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error sending ${relativePath}:`, err);
            res.status(err.status || 500).send("Error loading page");
        }
    });
}

// Routes for frontend pages. unsure what pages to .get(). I might delete some later.
// Landing/Main page
app.get("/", (req, res) => {
    sendFrontendFile(res, path.join("pages", "landing.html"));
});

// Informational pages
app.get("/about", (req, res) => {
    sendFrontendFile(res, path.join("pages", "about.html"));
});

app.get("/contact", (req, res) => {
    sendFrontendFile(res, path.join("pages", "contact.html"));
});

app.get("/privacy-policy", (req, res) => {
    sendFrontendFile(res, path.join("pages", "privacy-policy.html"));
});

app.get("/terms-of-service", (req, res) => {
    sendFrontendFile(res, path.join("pages", "terms-of-service.html"));
});

app.get("/safety", (req, res) => {
    sendFrontendFile(res, path.join("pages", "safety.html"));
});

// Sign up page
app.get("/signup", (req, res) => {
    sendFrontendFile(res, path.join("auth", "signup.html"));
});

// Sign in page
app.get("/signin", (req, res) => {
    sendFrontendFile(res, path.join("auth", "signin.html"));
});

app.get("/adminsignin", (req, res) => {
    sendFrontendFile(res, path.join("auth", "adminsignin.html"));
});

app.get("/myprofile", (req, res) => {
    sendFrontendFile(res, path.join("auth", "myprofile.html"));
});

// Booking page
app.get("/booking", (req, res) => {
    sendFrontendFile(res, path.join("facilities", "bookings.html"));
});

app.get("/rooms", (req, res) => {
    sendFrontendFile(res, path.join("facilities", "rooms.html"));
});

app.get("/labs", (req, res) => {
    sendFrontendFile(res, path.join("facilities", "labs.html"));
});

app.get("/equipment", (req, res) => {
    sendFrontendFile(res, path.join("facilities", "equipment.html"));
});

// Admin pages
app.get("/admin", (req, res) => {
    sendFrontendFile(res, path.join("admin", "main.html"));
});

app.get("/admin/resources", (req, res) => {
    sendFrontendFile(res, path.join("admin", "resources.html"));
});

app.get("/admin/bookings", (req, res) => {
    sendFrontendFile(res, path.join("admin", "bookings1.html"));
});

app.get("/admin/bookings/rooms", (req, res) => {
    sendFrontendFile(res, path.join("admin", "bookings-rooms.html"));
});

app.get("/admin/bookings/labs", (req, res) => {
    sendFrontendFile(res, path.join("admin", "bookings-labs.html"));
});

app.get("/admin/bookings/equipment", (req, res) => {
    sendFrontendFile(res, path.join("admin", "bookings-equipment.html"));
});

app.get("/admin/schedules", (req, res) => {
    sendFrontendFile(res, path.join("admin", "schedules.html"));
});

app.get("/admin/analytics", (req, res) => {
    sendFrontendFile(res, path.join("admin", "analytics.html"));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
