const express = require("express");
const path = require("path");
const app = express();
const PORT = 5000;
const frontendPath = path.join(__dirname, "../frontend");
const staticHtmlOptions = { extensions: ["html"] };

// Import auth routes
const authRoutes = require("./routes/authRoutes");

// Middleware to parse JSON
app.use(express.json());

// Mount authentication routes under /api/auth
app.use("/api/auth", authRoutes);

// Serve static files from frontend folder and allow extensionless HTML routes
app.use(express.static(frontendPath, staticHtmlOptions));
app.use(express.static(path.join(frontendPath, "pages"), staticHtmlOptions));
app.use("/facilities", express.static(path.join(frontendPath, "facilities"), staticHtmlOptions));
app.use("/admin", express.static(path.join(frontendPath, "admin"), staticHtmlOptions));
app.use("/auth", express.static(path.join(frontendPath, "auth"), staticHtmlOptions));

// Routes for frontend pages mapped to extensionless navigation paths
// Landing/Main page
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "pages", "landing.html"));
});

// Main informational pages
app.get(["/about", "/contact", "/privacy-policy", "/terms-of-service", "/safety"], (req, res) => {
    const page = req.path.replace("/", "") || "landing";
    res.sendFile(path.join(frontendPath, "pages", `${page}.html`));
});

// Auth pages
app.get("/signup", (req, res) => {
    res.sendFile(path.join(frontendPath, "auth", "signup.html"));
});

app.get("/signin", (req, res) => {
    res.sendFile(path.join(frontendPath, "auth", "signin.html"));
});

// Facilities pages
app.get(["/facilities/bookings", "/facilities/rooms", "/facilities/labs", "/facilities/equipment"], (req, res) => {
    const page = req.path.split("/").pop() || "bookings";
    res.sendFile(path.join(frontendPath, "facilities", `${page}.html`));
});

// Admin pages
app.get([
    "/admin/main",
    "/admin/resources",
    "/admin/analytics",
    "/admin/schedules",
    "/admin/bookings1",
], (req, res) => {
    const page = req.path.split("/").pop() || "main";
    res.sendFile(path.join(frontendPath, "admin", `${page}.html`));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
