-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  course VARCHAR(255),
  year INT,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users
INSERT INTO users (name, email, course, year, password) VALUES
('Dipesh Yadav', 'yadavd7@proton.me', 'Computer Science', 2, '$2a$10$eEED.iBhh9I636b0V8F6Eubx0yOaL.t7mP6RkC9lZpA2/D8s.uUOO'),
('Priya Patel', 'priya.patel@uni.edu', 'Business Management', 3, '$2a$10$eEED.iBhh9I636b0V8F6Eubx0yOaL.t7mP6RkC9lZpA2/D8s.uUOO'),
('John Smith', 'john.smith@uni.edu', 'Engineering', 2, '$2a$10$eEED.iBhh9I636b0V8F6Eubx0yOaL.t7mP6RkC9lZpA2/D8s.uUOO'),
('Emma Wilson', 'emma.wilson@uni.edu', 'Psychology', 1, '$2a$10$eEED.iBhh9I636b0V8F6Eubx0yOaL.t7mP6RkC9lZpA2/D8s.uUOO'),
('Michael Brown', 'michael.brown@uni.edu', 'Law', 4, '$2a$10$eEED.iBhh9I636b0V8F6Eubx0yOaL.t7mP6RkC9lZpA2/D8s.uUOO');
