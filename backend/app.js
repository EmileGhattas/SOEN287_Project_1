const express = require("express");
const path = require("path");
const app = express();
const PORT = 5000;

// Import auth routes
const authRoutes = require("./routes/authRoutes");

// Middleware to parse JSON
app.use(express.json());

// Mount authentication routes under /api/auth
app.use("/api/auth", authRoutes);

// Serve static files from the real frontend folder and allow extensionless HTML
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir, { extensions: ["html"] }));

// Routes for frontend pages. unsure what pages to .get(). I might delete some later.
// Landing/Main page
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendDir, "pages", "landing.html"));
});

// About page
app.get("/about", (req, res) => {
    res.sendFile(path.join(frontendDir, "pages", "about.html"));
});

// Contact page
app.get("/contact", (req, res) => {
    res.sendFile(path.join(frontendDir, "pages", "contact.html"));
});

// Privacy Policy page
app.get("/privacy-policy", (req, res) => {
    res.sendFile(path.join(frontendDir, "pages", "privacy-policy.html"));
});

// Terms of Service page
app.get("/terms-of-service", (req, res) => {
    res.sendFile(path.join(frontendDir, "pages", "terms-of-service.html"));
});

// Safety page
app.get("/safety", (req, res) => {
    res.sendFile(path.join(frontendDir, "pages", "safety.html"));
});

// Sign up page
app.get("/signup", (req, res) => {
    res.sendFile(path.join(frontendDir, "auth", "signup.html"));
});

// Sign in page
app.get("/signin", (req, res) => {
    res.sendFile(path.join(frontendDir, "auth", "signin.html"));
});

// Booking page
app.get("/booking", (req, res) => {
    res.sendFile(path.join(frontendDir, "facilities", "bookings.html"));
});

// Rooms page
app.get("/facilities/rooms", (req, res) => {
    res.sendFile(path.join(frontendDir, "facilities", "rooms.html"));
});

// Labs page
app.get("/facilities/labs", (req, res) => {
    res.sendFile(path.join(frontendDir, "facilities", "labs.html"));
});

// Equipment page
app.get("/facilities/equipment", (req, res) => {
    res.sendFile(path.join(frontendDir, "facilities", "equipment.html"));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
