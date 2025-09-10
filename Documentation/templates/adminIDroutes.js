// routes/admin-lost-ids.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, getOne } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadSingleImage, deleteImage } = require('../config/imageUpload');

const router = express.Router();

// Get all lost IDs (admin view with more details)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, status, id_type, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT 
        l.id, l.student_id, l.student_name, l.id_type, l.found_date, 
        l.found_location, l.description, l.image_url, l.status,
        l.created_at, l.updated_at,
        a.full_name as added_by_admin,
        COUNT(c.id) as claims_count
      FROM lost_ids l
      LEFT JOIN admins a ON l.added_by = a.id
      LEFT JOIN claims c ON l.id = c.lost_id_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add search filters
    if (search) {
      query += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR l.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (status && status !== 'all') {
      query += ` AND l.status = ?`;
      params.push(status);
    }
    
    if (id_type && id_type !== 'all') {
      query += ` AND l.id_type = ?`;
      params.push(id_type);
    }
    
    query += ` GROUP BY l.id ORDER BY l.created_at DESC`;
    
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const lostIds = await executeQuery(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT l.id) as total FROM lost_ids l WHERE 1=1`;
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR l.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (status && status !== 'all') {
      countQuery += ` AND l.status = ?`;
      countParams.push(status);
    }
    
    if (id_type && id_type !== 'all') {
      countQuery += ` AND l.id_type = ?`;
      countParams.push(id_type);
    }
    
    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: lostIds,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching lost IDs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch lost IDs' 
    });
  }
});

// Create new lost ID entry
router.post('/', [
  authenticateToken,
  requireAdmin,
  uploadSingleImage('image'),
  body('student_id').notEmpty().withMessage('Student ID is required'),
  body('student_name').notEmpty().withMessage('Student name is required'),
  body('id_type').isIn(['student_id', 'government_issued', 'other']).withMessage('Valid ID type required'),
  body('found_date').isDate().withMessage('Valid found date required'),
  body('found_location').notEmpty().withMessage('Found location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      student_id,
      student_name,
      id_type,
      found_date,
      found_location,
      description
    } = req.body;

    const adminId = req.user.id;
    
    // Handle image data
    let imageData = {};
    if (req.processedImage) {
      imageData = {
        image_filename: req.processedImage.filename,
        image_path: req.processedImage.path,
        image_url: req.processedImage.url,
        image_size: req.processedImage.size,
        image_mimetype: req.processedImage.mimetype
      };
    }

    // Create lost ID entry
    const result = await executeQuery(
      `INSERT INTO lost_ids 
       (student_id, student_name, id_type, found_date, found_location, description, 
        image_filename, image_path, image_url, image_size, image_mimetype, added_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id, student_name, id_type, found_date, found_location, description || null,
        imageData.image_filename || null,
        imageData.image_path || null,
        imageData.image_url || null,
        imageData.image_size || null,
        imageData.image_mimetype || null,
        adminId
      ]
    );

    // Get created record
    const newLostId = await getOne(
      `SELECT 
        l.*, a.full_name as added_by_admin 
       FROM lost_ids l 
       LEFT JOIN admins a ON l.added_by = a.id 
       WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Lost ID added successfully',
      data: newLostId
    });

  } catch (error) {
    console.error('Error creating lost ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lost ID entry'
    });
  }
});

// Update lost ID
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  uploadSingleImage('image'),
  body('student_id').optional().notEmpty().withMessage('Student ID cannot be empty'),
  body('student_name').optional().notEmpty().withMessage('Student name cannot be empty'),
  body('id_type').optional().isIn(['student_id', 'government_issued', 'other']).withMessage('Valid ID type required'),
  body('found_date').optional().isDate().withMessage('Valid found date required'),
  body('found_location').optional().notEmpty().withMessage('Found location cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    
    // Check if lost ID exists
    const existingLostId = await getOne('SELECT * FROM lost_ids WHERE id = ?', [id]);
    if (!existingLostId) {
      return res.status(404).json({
        success: false,
        error: 'Lost ID not found'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && ['student_id', 'student_name', 'id_type', 'found_date', 'found_location', 'description'].includes(key)) {
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    });

    // Handle new image
    if (req.processedImage) {
      // Delete old image if exists
      if (existingLostId.image_filename) {
        await deleteImage(existingLostId.image_filename);
      }
      
      updates.push('image_filename = ?', 'image_path = ?', 'image_url = ?', 'image_size = ?', 'image_mimetype = ?');
      params.push(
        req.processedImage.filename,
        req.processedImage.path,
        req.processedImage.url,
        req.processedImage.size,
        req.processedImage.mimetype
      );
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Update the record
    params.push(id);
    await executeQuery(
      `UPDATE lost_ids SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    // Get updated record
    const updatedLostId = await getOne(
      `SELECT 
        l.*, a.full_name as added_by_admin 
       FROM lost_ids l 
       LEFT JOIN admins a ON l.added_by = a.id 
       WHERE l.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Lost ID updated successfully',
      data: updatedLostId
    });

  } catch (error) {
    console.error('Error updating lost ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lost ID'
    });
  }
});

// Delete lost ID
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if lost ID exists
    const lostId = await getOne('SELECT * FROM lost_ids WHERE id = ?', [id]);
    if (!lostId) {
      return res.status(404).json({
        success: false,
        error: 'Lost ID not found'
      });
    }

    // Check if there are pending claims
    const pendingClaims = await executeQuery(
      'SELECT COUNT(*) as count FROM claims WHERE lost_id_id = ? AND status = "pending"',
      [id]
    );

    if (pendingClaims[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete lost ID with pending claims. Process claims first.'
      });
    }

    // Delete associated claims first
    await executeQuery('DELETE FROM claims WHERE lost_id_id = ?', [id]);

    // Delete image if exists
    if (lostId.image_filename) {
      await deleteImage(lostId.image_filename);
    }

    // Delete the lost ID
    await executeQuery('DELETE FROM lost_ids WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Lost ID deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting lost ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lost ID'
    });
  }
});

// Get specific lost ID details (admin view)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const lostId = await getOne(
      `SELECT 
        l.*, a.full_name as added_by_admin 
       FROM lost_ids l 
       LEFT JOIN admins a ON l.added_by = a.id 
       WHERE l.id = ?`,
      [id]
    );

    if (!lostId) {
      return res.status(404).json({
        success: false,
        error: 'Lost ID not found'
      });
    }

    // Get associated claims
    const claims = await executeQuery(
      `SELECT 
        c.id, c.verification_details, c.status, c.claim_date, c.admin_notes,
        s.first_name, s.last_name, s.student_id, s.email
       FROM claims c
       JOIN students s ON c.claimant_student_id = s.id
       WHERE c.lost_id_id = ?
       ORDER BY c.claim_date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...lostId,
        claims
      }
    });

  } catch (error) {
    console.error('Error fetching lost ID details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lost ID details'
    });
  }
});

module.exports = router;
