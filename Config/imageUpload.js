// config/imageUpload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
try {
  await fs.mkdir(uploadsDir, { recursive: true });
} catch (error) {
  console.log('Uploads directory already exists or error creating it:', error.message);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = crypto.randomUUID();
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Middleware for single image upload
export const uploadSingleImage = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'File size too large. Maximum size is 5MB.'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      
      // Process uploaded file
      if (req.file) {
        req.processedImage = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/uploads/${req.file.filename}` // URL to access the file
        };
      }
      
      next();
    });
  };
};

// Function to delete uploaded image
export const deleteImage = async (filename) => {
  if (!filename) return false;
  
  try {
    const filePath = path.join(uploadsDir, filename);
    await fs.unlink(filePath);
    console.log(`Deleted image: ${filename}`);
    return true;
  } catch (error) {
    console.error(`Error deleting image ${filename}:`, error);
    return false;
  }
};

// Function to check if image exists
export const imageExists = async (filename) => {
  if (!filename) return false;
  
  try {
    const filePath = path.join(uploadsDir, filename);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Get image path
export const getImagePath = (filename) => {
  return filename ? path.join(uploadsDir, filename) : null;
};

// Get image URL for frontend
export const getImageUrl = (filename) => {
  return filename ? `/uploads/${filename}` : null;
};

export default upload;