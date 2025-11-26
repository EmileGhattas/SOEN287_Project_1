const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { ensureDefaults } = require('./db/ensureDefaults');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/assets', express.static(ASSETS_DIR));
app.use(express.static(FRONTEND_DIR));

const pageRoutes = {
  '/': ['pages', 'landing.html'],
  '/about': ['pages', 'about.html'],
  '/contact': ['pages', 'contact.html'],
  '/privacy-policy': ['pages', 'privacy-policy.html'],
  '/terms-of-service': ['pages', 'terms-of-service.html'],
  '/safety': ['pages', 'safety.html'],
  '/signup': ['auth', 'signup.html'],
  '/signin': ['auth', 'signin.html'],
  '/adminsignin': ['auth', 'adminsignin.html'],
  '/myprofile': ['auth', 'myprofile.html'],
  '/booking': ['facilities', 'bookings.html'],
  '/rooms': ['facilities', 'rooms.html'],
  '/labs': ['facilities', 'labs.html'],
  '/equipment': ['facilities', 'equipment.html'],
  '/admin': ['admin', 'main.html'],
  '/admin/resources': ['admin', 'resources.html'],
  '/admin/bookings': ['admin', 'bookings1.html'],
  '/admin/bookings/rooms': ['admin', 'bookings-rooms.html'],
  '/admin/bookings/labs': ['admin', 'bookings-labs.html'],
  '/admin/bookings/equipment': ['admin', 'bookings-equipment.html'],
  '/admin/schedules': ['admin', 'schedules.html'],
  '/admin/analytics': ['admin', 'analytics.html'],
  '/notifications.html': ['auth', 'notifications.html'],
};

for (const [route, relative] of Object.entries(pageRoutes)) {
  app.get(route, (req, res) => {
    const filePath = path.join(FRONTEND_DIR, ...relative);
    res.sendFile(filePath);
  });
}

async function start() {
  try {
    await ensureDefaults();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
