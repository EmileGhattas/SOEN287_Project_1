DROP DATABASE IF EXISTS campus_resources;
CREATE DATABASE campus_resources;
USE campus_resources;

-- Core reference tables.
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  type ENUM('room','lab','equipment') NOT NULL,
  description TEXT,
  location VARCHAR(255),
  capacity INT,
  quantity INT,
  image_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE timeslots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(50) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE resource_timeslots (
  resource_id INT NOT NULL,
  timeslot_id INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (resource_id, timeslot_id),
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (timeslot_id) REFERENCES timeslots(id) ON DELETE CASCADE
);

CREATE TABLE resource_blackouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  blackout_date DATE NOT NULL,
  reason VARCHAR(255),
  UNIQUE KEY uniq_blackout (resource_id, blackout_date),
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resource_id INT NOT NULL,
  booking_date DATE NOT NULL,
  timeslot_id INT NULL,
  quantity INT DEFAULT 1,
  status ENUM('active','cancelled') DEFAULT 'active',
  purpose VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (timeslot_id) REFERENCES timeslots(id) ON DELETE SET NULL
);

-- Seed timeslots (09:00–22:30 at 90 minute intervals)
INSERT INTO timeslots (label, start_time, end_time) VALUES
 ('09:00-10:30', '09:00:00', '10:30:00'),
 ('10:30-12:00', '10:30:00', '12:00:00'),
 ('12:00-13:30', '12:00:00', '13:30:00'),
 ('13:30-15:00', '13:30:00', '15:00:00'),
 ('15:00-16:30', '15:00:00', '16:30:00'),
 ('16:30-18:00', '16:30:00', '18:00:00'),
 ('18:00-19:30', '18:00:00', '19:30:00'),
 ('19:30-21:00', '19:30:00', '21:00:00'),
 ('21:00-22:30', '21:00:00', '22:30:00');

-- Seed users (password hashes generated with bcrypt@10 rounds)
INSERT INTO users (username, email, password_hash, role) VALUES
 ('Admin', 'admin@learnspace.com', '$2b$10$d1lYErmhGPTegh8eZtU3zOZ3ed64.ATiQ3Dlv.Q.5gNcYuxuiI17.', 'admin'),
 ('Demo User', 'demo@learnspace.com', '$2b$10$4wLIUtNwl49U4sLPJq23ve4mwJrg17hdXwX/VFQLoNf09dlOJg5Ie', 'user');

-- Seed resources
INSERT INTO resources (name, type, description, location, capacity, quantity, image_path) VALUES
 ('Room 101', 'room', 'Quiet study room', 'Building A', 6, NULL, '/assets/room1.jpg'),
 ('Room 202', 'room', 'Conference-ready space', 'Building B', 10, NULL, '/assets/room2.jpg'),
 ('Chemistry Lab', 'lab', 'Equipped for chemistry labs', 'Science Wing', 20, NULL, '/assets/lab1.jpg'),
 ('Computer Lab', 'lab', 'High-end workstations', 'Tech Wing', 25, NULL, '/assets/lab2.jpg'),
 ('DSLR Camera', 'equipment', 'Checkout DSLR cameras', 'Equipment Desk', NULL, 8, '/assets/camera.jpg'),
 ('Tripod Kit', 'equipment', 'Tripod rentals', 'Equipment Desk', NULL, 12, '/assets/tripod.jpg');

-- Attach all default timeslots to room/lab resources
INSERT INTO resource_timeslots (resource_id, timeslot_id)
SELECT r.id, t.id FROM resources r JOIN timeslots t ON 1=1 WHERE r.type IN ('room','lab');
