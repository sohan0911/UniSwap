-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  course VARCHAR(255),
  year INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users
INSERT INTO users (name, email, course, year) VALUES
('Dipesh Yadav', 'yadavd7@proton.me', 'Computer Science', 2),
('Priya Patel', 'priya.patel@uni.edu', 'Business Management', 3),
('John Smith', 'john.smith@uni.edu', 'Engineering', 2),
('Emma Wilson', 'emma.wilson@uni.edu', 'Psychology', 1),
('Michael Brown', 'michael.brown@uni.edu', 'Law', 4);
