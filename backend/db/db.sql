USE 287_D;

SET FOREIGN_KEY_CHECKS =0;


DROP TABLE IF EXISTS equipment_bookings;
DROP TABLE IF EXISTS lab_bookings;
DROP TABLE IF EXISTS room_bookings;
DROP TABLE IF EXISTS bookings;

DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS labs;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;



CREATE TABLE users
(
user_id    INT AUTO_INCREMENT PRIMARY KEY,
username   VARCHAR(100) NOT NULL,
email      VARCHAR(255) NOT NULL UNIQUE,
password   VARCHAR(255) NOT NULL,
is_admin   BOOLEAN      NOT NULL DEFAULT FALSE,
created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO users(username, email, password, is_admin)
VALUES('admin','admin@learnspace.com','admin', TRUE);


CREATE TABLE rooms (
room_id      INT AUTO_INCREMENT PRIMARY KEY,
name         VARCHAR(50) NOT NULL UNIQUE,
capacity     INT
)ENGINE=InnoDB;
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
)ENGINE=InnoDB;
INSERT INTO labs(name)
VALUES('Chemistry Lab'), ('Physics Lab'), ('Computer Lab'), ('Robotics Lab');




CREATE TABLE equipment(
equipment_id    INT AUTO_INCREMENT PRIMARY KEY,
name            VARCHAR(50) NOT NULL UNIQUE,
total_quantity  INT NOT NULL DEFAULT 5,
available_quantity INT NOT NULL DEFAULT 5
)ENGINE=InnoDB;
INSERT INTO equipment(name, total_quantity, available_quantity)
VALUES('Camera',5,5),('Tripod',5,5),
('Microscope',5,5),('VR Headset',5,5);



CREATE TABLE bookings(
booking_id   INT AUTO_INCREMENT PRIMARY KEY,
user_id      INT NOT NULL,
booking_type ENUM('room', 'lab', 'equipment'),
booking_date DATE NOT NULL,
created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT booking_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE

)ENGINE=InnoDB;;


CREATE TABLE room_bookings(
      rm_booking_id   INT AUTO_INCREMENT PRIMARY KEY,
      booking_id      INT NOT NULL UNIQUE,
      room_id         INT NOT NULL,
      start_time      TIME NOT NULL,
      end_time        TIME NOT NULL,

      FOREIGN KEY (booking_id)REFERENCES bookings(booking_id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(room_id)
)ENGINE=InnoDB;
CREATE UNIQUE INDEX unique_rm_booking ON room_bookings(room_id, start_time, end_time);

CREATE TABLE lab_bookings(
     id             INT AUTO_INCREMENT PRIMARY KEY,
     booking_id     INT NOT NULL UNIQUE,
     lab_id         INT NOT NULL,
     time_slot      VARCHAR(20) NOT NULL,

     FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
     FOREIGN KEY (lab_id) REFERENCES labs(lab_id)
)ENGINE=InnoDB;
CREATE UNIQUE INDEX unique_lab_booking ON lab_bookings(lab_id, time_slot);


CREATE TABLE equipment_bookings(
       id               INT AUTO_INCREMENT PRIMARY KEY,
       booking_id       INT NOT NULL UNIQUE,
       equipment_id     INT NOT NULL,
       quantity         INT NOT NULL,

       FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
       FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
)ENGINE=InnoDB;