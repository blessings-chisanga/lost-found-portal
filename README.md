# UNZA Lost ID Management System

A comprehensive web application for managing lost student ID cards at the University of Zambia (UNZA). This system allows administrators to register found IDs and enables students to search for and claim their lost identification documents.

## 🎯 Features

### For Students
- **Browse Lost IDs**: Search through available lost ID cards using name, student ID, or keywords
- **Submit Claims**: Claim your lost ID with verification details
- **Track Progress**: Monitor claim status and receive admin updates
- **Secure Authentication**: JWT-based authentication with HTTP-only cookies

### For Administrators
- **Dashboard Analytics**: Real-time statistics and insights
- **ID Management**: Add, edit, and delete lost ID records with image support
- **Claims Processing**: Review, approve, reject, and track ID collections
- **Data Export**: Export data to CSV for reporting and analysis
- **Advanced Search**: Filter and search capabilities across all records

## 🛠️ Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MySQL with connection pooling
- **Authentication**: JWT tokens with HTTP-only cookies
- **File Upload**: Multer for image handling
- **Security**: Helmet, CORS, Rate limiting, bcrypt password hashing
- **Frontend**: Vanilla JavaScript with modern CSS Grid/Flexbox
- **Validation**: Express-validator for server-side validation

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v14 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd unza-lost-id-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Create Database
```sql
CREATE DATABASE web_portal_db;
USE web_portal_db;
```

#### Run the Schema
Execute the SQL commands in `DbSchema.sql` to create all necessary tables and insert sample data:

```bash
mysql -u your_username -p web_portal_db < DbSchema.sql
```

### 4. Environment Configuration

Create a `.env` file in the project root:

```env
# Database Configuration
host=localhost
user=your_mysql_username
password=your_mysql_password
database=web_portal_db

# JWT Secret (generate a strong random string)
jwtSecret=your_super_secret_jwt_key_here_minimum_32_characters

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 5. Create Required Directories
```bash
mkdir uploads
mkdir uploads/ids
```

### 6. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📁 Project Structure

```
├── app.js                 # Main application entry point
├── Controllers/           # Business logic controllers
│   ├── adminController.js
│   ├── authController.js
│   └── userController.js
├── dB/                   # Database configuration
│   ├── db.js
│   └── DbSchema.sql
├── Config/               # Configuration files
│   └── imageUpload.js
├── MiddleWare/           # Custom middleware
│   ├── adminValidator.js
│   ├── authMiddleware.js
│   └── signupValidator.js
├── routes/               # Route definitions
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   └── userRoutes.js
├── public/               # Static frontend files
│   ├── adminDashboard.html
│   ├── adminDashboard.css
│   ├── Adminlogin.html
│   ├── login.html
│   ├── loginpage.css
│   ├── signup.html
│   ├── styles.css
│   ├── userHome.html
│   └── userHome.css
├── uploads/              # File upload directory
└── .env                  # Environment variables
```

## 🔐 Default Login Credentials

### Admin Access
- **Username**: `Blessings` or `BlessingsChisanga@cs.unza.zm`
- **Password**: `password123` (default from schema)

### Test Student Account
- **Student ID**: `2021379566`
- **Password**: Use the signup form to create a student account

## 🌐 API Endpoints

### Authentication Routes
```
POST /signup              # Student registration
POST /login               # Student login
GET  /logout              # Student logout
POST /admin/login         # Admin login
GET  /admin/logout        # Admin logout
GET  /auth/check          # Check user authentication
GET  /admin/auth/check    # Check admin authentication
```

### User Routes (Prefix: `/api/users`)
```
GET  /lost-ids                    # Get available lost IDs
GET  /lost-ids/:id               # Get specific lost ID details
GET  /lost-ids/search/suggestions # Get search suggestions
GET  /lost-ids/meta/id-types     # Get ID type filters
POST /claims                     # Submit a claim
GET  /claims/my-claims           # Get user's claims
GET  /claims/:id                 # Get specific claim details
DELETE /claims/:id               # Cancel a claim
```

### Admin Routes (Prefix: `/api/admin`)
```
# Dashboard & Statistics
GET  /dashboard                  # Dashboard statistics
GET  /trends                     # Trend analytics
GET  /stats/id-types            # ID type statistics
GET  /stats/locations           # Location statistics
GET  /stats/processing-times    # Processing time analytics
GET  /activity                  # Recent activity feed
GET  /health                    # System health check

# Lost ID Management
GET  /lost-ids                  # Get all lost IDs
GET  /lost-ids/:id              # Get lost ID details
POST /lost-ids                  # Create new lost ID
PUT  /lost-ids/:id              # Update lost ID
DELETE /lost-ids/:id            # Delete lost ID

# Claims Management
GET  /claims                    # Get all claims
GET  /claims/:id                # Get claim details
GET  /claims/stats/overview     # Claims statistics
POST /claims/:id/approve        # Approve claim
POST /claims/:id/reject         # Reject claim
POST /claims/:id/collect        # Mark as collected
POST /claims/bulk/approve       # Bulk approve claims

# Data Export
GET  /export/csv                # Export data to CSV
```

## 🎨 Frontend Pages

### Public Pages
- **`/login.html`** - Student login page
- **`/signup.html`** - Student registration page
- **`/Adminlogin.html`** - Admin login page

### Protected Pages
- **`/userHome.html`** - Student dashboard (requires user authentication)
- **`/adminDashboard.html`** - Admin dashboard (requires admin authentication)

## 💾 Database Schema

### Core Tables
- **`students`** - Student user accounts
- **`admins`** - Administrator accounts
- **`lost_ids`** - Lost ID records with images
- **`claims`** - Student claims for lost IDs

### Key Relationships
- Lost IDs are linked to the admin who added them
- Claims link students to specific lost IDs
- Claims can be processed by admins with status tracking

## 🔧 Configuration Options

### File Upload Settings
- **Maximum file size**: 5MB
- **Allowed formats**: JPEG, PNG, GIF, WebP
- **Storage location**: `uploads/` directory
- **Naming convention**: Timestamp + UUID + original extension

### Security Features
- **Rate limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for cross-origin requests
- **Helmet**: Security headers enabled
- **Password hashing**: bcrypt with salt rounds
- **JWT expiration**: 3 days

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production` in environment
2. Use strong JWT secret (minimum 32 characters)
3. Configure secure database credentials
4. Set up HTTPS in production
5. Configure proper CORS origins
6. Set up file backup for uploads directory
7. Configure database backups
8. Set up monitoring and logging

### Environment Variables for Production
```env
NODE_ENV=production
host=your_production_db_host
user=your_production_db_user
password=your_secure_db_password
database=web_portal_db
jwtSecret=your_very_secure_jwt_secret_key_minimum_32_characters
PORT=3000
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check MySQL service status
sudo systemctl status mysql

# Restart MySQL if needed
sudo systemctl restart mysql

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/

# Fix permissions if needed
chmod 755 uploads/
chmod 755 uploads/ids/
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID)
kill -9 <PID>
```

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=app:*
```

## 📊 Usage Examples

### Adding a Lost ID (Admin)
1. Login to admin dashboard
2. Navigate to "Manage Lost IDs" tab
3. Fill in the "Add New Lost ID" form
4. Upload an image (optional)
5. Click "Add Lost ID"

### Claiming an ID (Student)
1. Login to student portal
2. Browse available lost IDs
3. Search using name or student ID
4. Click "Claim This ID" on your ID
5. Provide verification details
6. Wait for admin approval

### Processing Claims (Admin)
1. Go to "Manage Claims" tab
2. Review pending claims
3. Click "View" to see details
4. Approve or reject with notes
5. Mark as collected when student picks up

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Support

For support or questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section above

## 🔄 Updates & Maintenance

### Regular Maintenance Tasks
- **Database cleanup**: Remove old processed claims periodically
- **File cleanup**: Remove orphaned images
- **Log rotation**: Manage application logs
- **Security updates**: Keep dependencies updated

### Backup Recommendations
- **Database**: Daily automated backups
- **File uploads**: Weekly backup of uploads directory
- **Configuration**: Version control all configuration files

---

**Built with ❤️ for UNZA Students**