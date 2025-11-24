# Campus Resource Booking & Management System

Refactored SOEN 287 project implementing a full stack Node.js + MySQL system for room, lab, and equipment bookings while keeping the existing frontend layout intact.

## Stack
- Node.js + Express backend
- MySQL (mysql2/promise) with seeded schema
- JWT-based authentication
- Static HTML/CSS/JS frontend served by Express

## Project structure
- `backend/` – Express app, routes, controllers, models, database config
- `backend/db/schema.sql` – Database schema & seeds (admin + demo users, resources, timeslots). This is the single authoritative SQL file (older `db.sql` has been removed).
- `frontend/` – Existing static pages and booking flows
- `assets/` – Shared images/styles

## Setup
1. Run MySQL and execute `backend/db/schema.sql` to create the `campus_resources` database with seed data.
2. Create a `.env` file in the project root:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=campus_resources
   JWT_SECRET=changeme
   PORT=5001
   ```
3. Install dependencies and start the server:
   ```bash
   npm install
   npm start
   ```
4. Access the UI at `http://localhost:5001/`.

### Default accounts
- Admin: `admin@learnspace.com` / `Admin@123`
- Demo user: `demo@learnspace.com` / `Password@123`

## Key capabilities
- User registration/login, profile update, JWT session handling
- Admin CRUD for resources plus blackout management and usage stats endpoints
- Room/Lab timeslot booking with conflict prevention
- Equipment daily booking with quantity enforcement
- Client-side booking flows updated to consume the new API
