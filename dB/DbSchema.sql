-- Database Schema
CREATE DATABASE web_portal_db;
use web_portal_db;
-- Table for students
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admins table (library staff)
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'super_admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for lost IDs
CREATE TABLE lost_ids (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    id_type ENUM('student_id', 'government_issued', 'other') DEFAULT 'student_id',
    found_date DATE NOT NULL,
    found_location VARCHAR(100),
    description TEXT,
    image_filename VARCHAR(255), -- Original filename
    image_path VARCHAR(500), -- Full path to stored image
    image_url VARCHAR(500), -- URL for accessing image
    image_size INT, -- File size in bytes
    image_mimetype VARCHAR(50), -- image/jpeg, image/png, etc.
    status ENUM('available', 'claimed', 'returned') DEFAULT 'available',
    added_by INT, -- Admin who added this record
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES admins(id)
);

-- Claims table
CREATE TABLE claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lost_id_id INT NOT NULL,
    claimant_student_id INT NOT NULL,
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_details TEXT,
    status ENUM('pending', 'approved', 'rejected', 'collected') DEFAULT 'pending',
    admin_notes TEXT,
    processed_by INT,
    processed_at TIMESTAMP NULL,
    collection_date TIMESTAMP NULL,
    FOREIGN KEY (lost_id_id) REFERENCES lost_ids(id),
    FOREIGN KEY (claimant_student_id) REFERENCES students(id),
    FOREIGN KEY (processed_by) REFERENCES admins(id)
);



-- Indexes for better performance
CREATE INDEX idx_lost_ids_student_id ON lost_ids(student_id);
CREATE INDEX idx_lost_ids_status ON lost_ids(status);
CREATE INDEX idx_lost_ids_found_date ON lost_ids(found_date);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_lost_id ON claims(lost_id_id);
CREATE INDEX idx_students_student_id ON students(student_id);


INSERT INTO admins (username, email, password_hash, full_name, role) VALUES
('Blessings', 'BlessingsChisanga@cs.unza.zm', '$2a$10$7T3wnHQJLmmHJZAkUwXkWud98K8AF3IupdudvdviGANif2DIwt.hC', 'Library Administrator', 'admin');

INSERT INTO students (student_id, first_name, last_name, email, password_hash) VALUES
('2021379566', 'John', 'Doe', 'john.doe@student.edu', '$2b$10$hash_here'),
('2021379655', 'Jane', 'Smith', 'jane.smith@student.edu', '$2b$10$hash_here');

INSERT INTO lost_ids (student_id, student_name, id_type, found_date, found_location, description, status, added_by) VALUES
('2021379566', 'John Doe', 'student_id', '2024-06-01', 'Library Reading Room', 'Blue student ID card', 'available', 1),
('2021379655', 'Jane Smith', 'government_issued', '2024-06-03', 'Computer Lab', 'Government NRC', 'available', 1);

INSERT INTO admins (username, email, password_hash, full_name, role)
VALUES ('testadmin', 'admin@example.com', '$2a$10$7T3wnHQJLmmHJZAkUwXkWud98K8AF3IupdudvdviGANif2DIwt.hC', 'Test Admin', 'admin');
