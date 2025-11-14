
CREATE TABLE IF NOT EXISTS users (
     user_id INTEGER PRIMARY KEY AUTOINCREMENT,
     name VARCHAR(50) NOT NULL,
     email VARCHAR(255) NOT NULL,
     password VARCHAR(255),
     created DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
     last_login DATETIME DEFAULT NULL
    );

CREATE TABLE IF NOT EXISTS rooms (
     room_id INTEGER PRIMARY KEY AUTOINCREMENT,
     name VARCHAR(50) NOT NULL
);


CREATE TABLE IF NOT EXISTS room_bookings (
     booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id BIGINT UNSIGNED NOT NULL,
     room_id BIGINT UNSIGNED NOT NULL,
     booking_date DATE NOT NULL,
     start_time TIME NOT NULL,
     end_time TIME NOT NULL,
     created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

         CONSTRAINT check_time CHECK(start_time < end_time),
     CONSTRAINT user_room_booking FOREIGN KEY (user_id) REFERENCES users(user_id),
     CONSTRAINT room_booking FOREIGN KEY (room_id) REFERENCES rooms(room_id)

);


