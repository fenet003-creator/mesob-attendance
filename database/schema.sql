CREATE DATABASE IF NOT EXISTS bg_mesob_attendance;
USE bg_mesob_attendance;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'intern') NOT NULL DEFAULT 'intern',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  university VARCHAR(150),
  department VARCHAR(150),
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('active', 'inactive', 'completed') NOT NULL DEFAULT 'active',
  profile_photo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  intern_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  attendance_status ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'absent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
  UNIQUE KEY unique_intern_date (intern_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL
);

INSERT INTO settings (setting_key, setting_value) VALUES
  ('work_start_time', '08:00'),
  ('late_threshold', '08:15'),
  ('absent_threshold', '08:30')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
