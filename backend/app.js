const express = require("express");
const path = require("path");
const app = express();
const PORT = 5000;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

// Import auth routes
const authRoutes = require("./routes/authRoutes");

// Middleware to parse JSON
app.use(express.json());

// Mount authentication routes under /api/auth
app.use("/api/auth", authRoutes);

// Serve static files from frontend folder and allow extensionless HTML requests
app.use(
  express.static(FRONTEND_DIR, {
    extensions: ["html"],
  })
);

// Routes for frontend pages. unsure what pages to .get(). I might delete some later.
// Landing/Main page
app.get("/", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "pages", "landing.html"));
});

// Sign up page
app.get("/signup", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "auth", "signup.html"));
});

// Sign in page
app.get("/signin", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "auth", "signin.html"));
});

// Booking page
app.get("/booking", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "facilities", "bookings.html"));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
