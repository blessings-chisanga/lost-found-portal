# 🧭 Lost-Found-Web-Portal

A modern, full-stack **Lost and Found** application designed for university campuses. This app helps users report, find, and reclaim lost items with ease.

## 🔧 Tech Stack

**Frontend:**

- Vanilla JavaScript
- Google Maps API (location tagging)

**Backend:**

- Node.js
- Express.js (Framework)

**Database:**

- Mysql

**Authentication & Storage:**

- Firebase Authentication
- Firebase Cloud Storage
- Firebase Cloud Messaging (for notifications)

## 🚀 Features

- 🔍 **Report Lost & Found Items** with descriptions, images, and location tags.
- 📍 **Map View** of all reported items using Google Maps.
- 🔐 **Secure Authentication** via Firebase.
- 🖼️ **Image Uploads** via Firebase Storage.
- 🔔 **Push Notifications** for updates or matches.
- 🗃️ **Item Management Dashboard** for users and admins.

# Implementation Task List

**Phase 1: Project Setup & Foundation**
1.2 Dependencies Installation
Server Dependencies:

 Install Express.js (npm install express)
 Install JWT (npm install jsonwebtoken)
 Install bcryptjs for password hashing (npm install bcryptjs)
 Install body-parser (npm install body-parser)
 Install cors (npm install cors)
 Install dotenv (npm install dotenv)
 Install multer for file uploads (npm install multer)
 Choose and install database driver (e.g., npm install sqlite3 or npm install mysql2)

Development Dependencies:

 Install nodemon (npm install --save-dev nodemon)
 Update package.json scripts for development

**Phase 2: Database Design & Setup**
2.1 Database Schema Design

 Design Users table (id, username, email, password, role, created_at)
 Design LostIDs table (id, student_name, student_id, description, date_found, image_url, status, created_at)
 Design Claims table (id, lost_id_ref, claimant_user_id, verification_details, status, created_at, processed_at)
 Design audit/log table for admin actions

2.2 Database Implementation

 Create database connection module
 Write SQL migration scripts for table creation
 Create database initialization script
 Add sample data for testing

**Phase 3: Backend API Development**
3.1 Authentication System

 Create JWT configuration and utilities
 Implement user registration endpoint
 Implement user login endpoint
 Implement JWT middleware for protected routes
 Create role-based authorization middleware (student/admin)
 Implement password reset functionality (optional)

3.2 Lost ID Management API

 Create endpoint to add new lost ID (admin only)
 Create endpoint to get all lost IDs (public/student)
 Create endpoint to search lost IDs by name
 Create endpoint to search lost IDs by student ID
 Create endpoint to get single lost ID details
 Create endpoint to update lost ID status (admin only)
 Implement image upload functionality for ID photos

3.3 Claims Management API

 Create endpoint to submit claim (authenticated students)
 Create endpoint to get user's claims (authenticated students)
 Create endpoint to get all claims (admin only)
 Create endpoint to approve/reject claims (admin only)
 Create endpoint to get claim details
 Implement claim validation logic

3.4 Admin Dashboard API

 Create endpoint to get dashboard statistics
 Create endpoint to get recent activities
 Create endpoint to export claims data
 Create endpoint to manage user accounts

**Phase 4: Frontend Development**
4.1 HTML Structure

 Create base HTML template with navigation
 Create login/register pages
 Create main dashboard/browse page
 Create search results page
 Create claim submission form
 Create user profile/claims page
 Create admin dashboard
 Create admin claims review page

4.2 CSS Styling

 Create responsive base styles
 Style navigation and header
 Style authentication forms
 Style ID cards display grid
 Style search and filter components
 Style claim forms and status indicators
 Style admin dashboard components
 Add loading states and animations

4.3 JavaScript Frontend Logic

 Create utility functions for API calls
 Implement authentication state management
 Create login/logout functionality
 Implement ID browsing and display
 Create search functionality (name and ID)
 Implement real-time search suggestions
 Create claim submission functionality
 Implement form validation
 Create user claims tracking
 Implement admin dashboard functionality
 Create claim review and processing features

**Phase 5: Security & Validation**
5.1 Input Validation

 Implement server-side validation for all endpoints
 Add client-side form validation
 Sanitize user inputs to prevent XSS
 Validate file uploads (type, size, security)

5.2 Security Measures

 Implement rate limiting for API endpoints
 Add CORS configuration
 Implement proper error handling (don't expose sensitive info)
 Add input sanitization middleware
 Implement secure file upload validation

5.3 Authentication Security

 Implement secure JWT token expiration
 Add refresh token functionality
 Implement proper password hashing
 Add account lockout after failed attempts
 Implement session management

**Phase 6: Features & Enhancements**

6.2 User Experience

 Add loading indicators
 Implement error messages and success notifications
 Create responsive mobile design
 Implement Keyboard Navigation
 Add accessibility features

6.3 Admin Features

 Create admin user management
 Implement audit trail logging
 Add bulk import functionality for lost IDs
 Create reporting and analytics

**Phase 7: Testing & Quality Assurance**
7.1 Testing

 Create unit tests for API endpoints
 Test authentication and authorization
 Test file upload functionality
 Test search and filtering
 Test claim submission and processing
 Perform cross-browser testing
 Test responsive design on various devices

7.2 Error Handling

 Create user-friendly error messages
 Test error scenarios and edge cases

**Phase 8: Deployment & Production**


**Phase 9: Documentation & Maintenance**
9.1 Documentation

 Create API documentation
 Write user manual
 Create admin guide
 Document deployment process
 Create troubleshooting guide