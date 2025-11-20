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

CREATE TABLE labs(
    lab_id      INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    capacity    INT
);

CREATE TABLE equipment(
    equipment_id    INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    available_quantity  INT NOT NULL DEFAULT 5
);


CREATE TABLE bookings (
    booking_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT  NOT NULL,
    booking_type ENUM('room', 'lab', 'equipment'),

    room_id      INT NULL,
    lab_id       INT NULL,
    equipment_id INT NULL,

    booking_date DATE NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT booking_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT booking_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE SET NULL,

    CONSTRAINT booking_lab FOREIGN KEY (lab_id) REFERENCES labs(lab_id) ON DELETE SET NULL,

    CONSTRAINT booking_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE SET NULL


);

