CREATE DATABASE IF NOT EXISTS 287_D
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE 287_D;

CREATE TABLE users (
user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
username      VARCHAR(100) NOT NULL,
email         VARCHAR(255) NOT NULL UNIQUE,
password      VARCHAR(255) NOT NULL,
is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

INSERT INTO users(username, email, password, is_admin)
VALUES('admin','admin@learnspace.com','admin', TRUE);




CREATE TABLE rooms (
room_id      INT AUTO_INCREMENT PRIMARY KEY,
name         VARCHAR(50) NOT NULL UNIQUE,
capacity     INT
);
INSERT INTO rooms(name, capacity)
VALUES('Room 1','4'),
('Room 2','4'),
('Room 3','6'),
('Room 4','4'),
('Room 5','4'),
('Room 6','6'),
('Room 7','6'),
('Room 8','6'),
('Room 9','6'),
('Room 10','3'),
('Conference Room A','12'),
('Conference Room B','20');



CREATE TABLE labs(
lab_id      INT AUTO_INCREMENT PRIMARY KEY,
name        VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO labs(name)
VALUES('Chemistry Lab'), ('Physics Lab'), ('Computer Lab'), ('Robotics Lab');


CREATE TABLE equipment(
equipment_id    INT AUTO_INCREMENT PRIMARY KEY,
name            VARCHAR(50) NOT NULL UNIQUE,
available_quantity  INT NOT NULL DEFAULT 5
);

CREATE TABLE bookings (
booking_id   INT AUTO_INCREMENT PRIMARY KEY,
user_id      INT  NOT NULL,
booking_type ENUM('room', 'lab', 'equipment'),
booking_date DATE NOT NULL,
created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT booking_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE

);

