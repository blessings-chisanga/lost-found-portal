// routes/admin-claims.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, getOne } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all claims with filtering and pagination
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, sortBy = 'claim_date', sortOrder = 'DESC' } = req.query;
    
    let query = `
      SELECT 
        c.id, c.lost_id_id, c.verification_details, c.status, c.claim_date,
        c.admin_notes, c.processed_at, c.collection_date,
        l.student_id as lost_student_id, l.student_name as lost_student_name, 
        l.id_type, l.found_date, l.found_location, l.image_url,
        s.student_id as claimant_student_id, s.first_name, s.last_name, s.email, s.phone,
        a.full_name as processed_by_admin
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      JOIN students s ON c.claimant_student_id = s.id
      LEFT JOIN admins a ON c.processed_by = a.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add filters
    if (status && status !== 'all') {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    
    if (search) {
      query += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add sorting
    const allowedSortFields = ['claim_date', 'status', 'lost_student_name', 'found_date'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'claim_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    if (sortField === 'lost_student_name') {
      query += ` ORDER BY l.student_name ${order}`;
    } else if (sortField === 'found_date') {
      query += ` ORDER BY l.found_date ${order}`;
    } else {
      query += ` ORDER BY c.${sortField} ${order}`;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const claims = await executeQuery(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      JOIN students s ON c.claimant_student_id = s.id
      WHERE 1=1
    `;
    const countParams = [];
    
    if (status && status !== 'all') {
      countQuery += ` AND c.status = ?`;
      countParams.push(status);
    }
    
    if (search) {
      countQuery += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: claims,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch claims'
    });
  }
});

// Get specific claim details
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const claim = await getOne(
      `SELECT 
        c.id, c.lost_id_id, c.verification_details, c.status, c.claim_date,
        c.admin_notes, c.processed_at, c.collection_date,
        l.student_id as lost_student_id, l.student_name as lost_student_name, 
        l.id_type, l.found_date, l.found_location, l.description, l.image_url,
        s.student_id as claimant_student_id, s.first_name, s.last_name, s.email, s.phone,
        a.full_name as processed_by_admin
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      JOIN students s ON c.claimant_student_id = s.id
      LEFT JOIN admins a ON c.processed_by = a.id
      WHERE c.id = ?`,
      [id]
    );
    
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }
    
    res.json({
      success: true,
      data: claim
    });
    
  } catch (error) {
    console.error('Error fetching claim details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch claim details'
    });
  }
});

// Approve claim
router.post('/:id/approve', [
  authenticateToken,
  requireAdmin,
  body('admin_notes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
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
    const { admin_notes } = req.body;
    const adminId = req.user.id;

    // Check if claim exists and is pending
    const claim = await getOne(
      'SELECT id, lost_id_id, status FROM claims WHERE id = ?',
      [id]
    );

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending claims can be approved'
      });
    }

    // Update claim status to approved
    await executeQuery(
      `UPDATE claims 
       SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [admin_notes || 'Claim approved - ID ready for collection', adminId, id]
    );

    // Get updated claim details
    const updatedClaim = await getOne(
      `SELECT 
        c.*, l.student_name as lost_student_name, l.id_type,
        s.first_name, s.last_name, s.email
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      JOIN students s ON c.claimant_student_id = s.id
      WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Claim approved successfully. Student will be notified to collect their ID.',
      data: updatedClaim
    });

  } catch (error) {
    console.error('Error approving claim:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve claim'
    });
  }
});

// Reject claim
router.post('/:id/reject', [
  authenticateToken,
  requireAdmin,
  body('admin_notes').notEmpty().withMessage('Rejection reason is required')
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
    const { admin_notes } = req.body;
    const adminId = req.user.id;

    // Check if claim exists and is pending
    const claim = await getOne(
      'SELECT id, lost_id_id, status FROM claims WHERE id = ?',
      [id]
    );

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending claims can be rejected'
      });
    }

    // Update claim status to rejected
    await executeQuery(
      `UPDATE claims 
       SET status = 'rejected', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [admin_notes, adminId, id]
    );

    // Update lost ID status back to available
    await executeQuery(
      'UPDATE lost_ids SET status = "available" WHERE id = ?',
      [claim.lost_id_id]
    );

    // Get updated claim details
    const updatedClaim = await getOne(
      `SELECT 
        c.*, l.student_name as lost_student_name, l.id_type,
        s.first_name, s.last_name, s.email
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      JOIN students s ON c.claimant_student_id = s.id
      WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Claim rejected successfully. Lost ID is now available for other claims.',
      data: updatedClaim
    });

  } catch (error) {
    console.error('Error rejecting claim:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject claim'
    });
  }
});

// Mark claim as collected
router.post('/:id/collect', [
  authenticateToken,
  requireAdmin,
  body('admin_notes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
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
    const { admin_notes } = req.body;
    const adminId = req.user.id;

    // Check if claim exists and is approved
    const claim = await getOne(
      'SELECT id, lost_id_id, status FROM claims WHERE id = ?',
      [id]
    );

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    if (claim.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Only approved claims can be marked as collected'
      });
    }

    // Update claim status to collected
    await executeQuery(
      `UPDATE claims 
       SET status = 'collected', admin_notes = ?, processed_by = ?, collection_date = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [admin_notes || 'ID successfully collected by verified owner', adminId, id]
    );

    // Update lost ID status to returned
    await executeQuery(
      'UPDATE lost_ids SET status = "returned" WHERE id = ?',
      [claim.lost_id_id]
    );

    // Get updated claim details
    const updatedClaim = await getOne(
      `SELECT 
        c.*, l.student_name as lost_student_name, l.id_type,
        s.first_name, s.last_name, s.email
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      JOIN students s ON c.claimant_student_id = s.id
      WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'ID collection confirmed successfully.',
      data: updatedClaim
    });

  } catch (error) {
    console.error('Error marking claim as collected:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark claim as collected'
    });
  }
});

// Bulk approve claims
router.post('/bulk/approve', [
  authenticateToken,
  requireAdmin,
  body('claim_ids').isArray().withMessage('claim_ids must be an array'),
  body('admin_notes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
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

    const { claim_ids, admin_notes } = req.body;
    const adminId = req.user.id;

    if (claim_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No claims selected'
      });
    }

    // Check all claims are pending
    const placeholders = claim_ids.map(() => '?').join(',');
    const pendingClaims = await executeQuery(
      `SELECT id FROM claims WHERE id IN (${placeholders}) AND status = 'pending'`,
      claim_ids
    );

    if (pendingClaims.length !== claim_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'Some claims are not in pending status'
      });
    }

    // Bulk approve
    await executeQuery(
      `UPDATE claims 
       SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders})`,
      [admin_notes || 'Bulk approved - IDs ready for collection', adminId, ...claim_ids]
    );

    res.json({
      success: true,
      message: `${claim_ids.length} claims approved successfully`
    });

  } catch (error) {
    console.error('Error bulk approving claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve claims'
    });
  }
});

// Get claims statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    // Basic counts
    const totalClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE claim_date >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [period]
    );
    
    const pendingClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "pending"'
    );
    
    const approvedClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "approved"'
    );
    
    const collectedClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "collected" AND collection_date >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [period]
    );
    
    const rejectedClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "rejected" AND processed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [period]
    );
    
    // Daily claims for the last 7 days
    const dailyStats = await executeQuery(
      `SELECT 
        DATE(claim_date) as date,
        COUNT(*) as claims_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'collected' THEN 1 ELSE 0 END) as collected_count
      FROM claims 
      WHERE claim_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(claim_date)
      ORDER BY date DESC`
    );
    
    // ID type distribution
    const idTypeStats = await executeQuery(
      `SELECT 
        l.id_type, 
        COUNT(c.id) as claims_count
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      WHERE c.claim_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY l.id_type`,
      [period]
    );
    
    res.json({
      success: true,
      data: {
        summary: {
          total_claims: totalClaims.count,
          pending_claims: pendingClaims.count,
          approved_claims: approvedClaims.count,
          collected_claims: collectedClaims.count,
          rejected_claims: rejectedClaims.count,
          success_rate: totalClaims.count > 0 ? 
            Math.round((collectedClaims.count / totalClaims.count) * 100) : 0
        },
        daily_stats: dailyStats,
        id_type_distribution: idTypeStats,
        period_days: parseInt(period)
      }
    });
    
  } catch (error) {
    console.error('Error fetching claims statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
