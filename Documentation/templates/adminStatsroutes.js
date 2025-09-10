// routes/admin-stats.js
const express = require('express');
const { executeQuery, getOne } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Dashboard overview statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Current status counts
    const totalLostIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids'
    );
    
    const availableIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE status = "available"'
    );
    
    const claimedIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE status = "claimed"'
    );
    
    const returnedIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE status = "returned"'
    );
    
    const totalClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims'
    );
    
    const pendingClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "pending"'
    );
    
    const totalStudents = await getOne(
      'SELECT COUNT(*) as count FROM students'
    );
    
    // Recent activity (last 7 days)
    const recentLostIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    
    const recentClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE claim_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    
    const recentCollections = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "collected" AND collection_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    
    // Success rate calculation
    const completedClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "collected"'
    );
    
    const successRate = totalClaims.count > 0 ? 
      Math.round((completedClaims.count / totalClaims.count) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        overview: {
          total_lost_ids: totalLostIds.count,
          available_ids: availableIds.count,
          claimed_ids: claimedIds.count,
          returned_ids: returnedIds.count,
          total_claims: totalClaims.count,
          pending_claims: pendingClaims.count,
          total_students: totalStudents.count,
          success_rate: successRate
        },
        recent_activity: {
          new_lost_ids: recentLostIds.count,
          new_claims: recentClaims.count,
          recent_collections: recentCollections.count
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Monthly trends
router.get('/trends', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    
    // Monthly lost IDs added
    const monthlyLostIds = await executeQuery(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count
      FROM lost_ids
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month`,
      [months]
    );
    
    // Monthly claims submitted
    const monthlyClaims = await executeQuery(
      `SELECT 
        DATE_FORMAT(claim_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM claims
      WHERE claim_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(claim_date, '%Y-%m')
      ORDER BY month`,
      [months]
    );
    
    // Monthly collections
    const monthlyCollections = await executeQuery(
      `SELECT 
        DATE_FORMAT(collection_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM claims
      WHERE collection_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      AND status = 'collected'
      GROUP BY DATE_FORMAT(collection_date, '%Y-%m')
      ORDER BY month`,
      [months]
    );
    
    res.json({
      success: true,
      data: {
        lost_ids: monthlyLostIds,
        claims: monthlyClaims,
        collections: monthlyCollections,
        period_months: parseInt(months)
      }
    });
    
  } catch (error) {
    console.error('Error fetching trend statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trend statistics'
    });
  }
});

// ID type distribution
router.get('/id-types', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (period !== 'all') {
      whereClause = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(period);
    }
    
    const idTypeStats = await executeQuery(
      `SELECT 
        id_type,
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_count,
        SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_count,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_count
      FROM lost_ids 
      ${whereClause}
      GROUP BY id_type
      ORDER BY total_count DESC`,
      params
    );
    
    res.json({
      success: true,
      data: idTypeStats
    });
    
  } catch (error) {
    console.error('Error fetching ID type statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ID type statistics'
    });
  }
});

// Location analysis
router.get('/locations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (period !== 'all') {
      whereClause = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(period);
    }
    
    const locationStats = await executeQuery(
      `SELECT 
        found_location,
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_count,
        ROUND((SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as return_rate
      FROM lost_ids 
      ${whereClause}
      GROUP BY found_location
      HAVING total_count > 0
      ORDER BY total_count DESC
      LIMIT 10`,
      params
    );
    
    res.json({
      success: true,
      data: locationStats
    });
    
  } catch (error) {
    console.error('Error fetching location statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch location statistics'
    });
  }
});

// Processing time analysis
router.get('/processing-times', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const processingTimes = await executeQuery(
      `SELECT 
        AVG(TIMESTAMPDIFF(HOUR, claim_date, processed_at)) as avg_processing_hours,
        MIN(TIMESTAMPDIFF(HOUR, claim_date, processed_at)) as min_processing_hours,
        MAX(TIMESTAMPDIFF(HOUR, claim_date, processed_at)) as max_processing_hours,
        COUNT(*) as processed_claims
      FROM claims 
      WHERE processed_at IS NOT NULL
      AND claim_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    
    const collectionTimes = await executeQuery(
      `SELECT 
        AVG(TIMESTAMPDIFF(HOUR, processed_at, collection_date)) as avg_collection_hours,
        MIN(TIMESTAMPDIFF(HOUR, processed_at, collection_date)) as min_collection_hours,
        MAX(TIMESTAMPDIFF(HOUR, processed_at, collection_date)) as max_collection_hours,
        COUNT(*) as collected_claims
      FROM claims 
      WHERE collection_date IS NOT NULL
      AND processed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    
    res.json({
      success: true,
      data: {
        processing: processingTimes[0],
        collection: collectionTimes[0]
      }
    });
    
  } catch (error) {
    console.error('Error fetching processing time statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch processing time statistics'
    });
  }
});

// Recent activity feed
router.get('/activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Recent lost IDs added
    const recentLostIds = await executeQuery(
      `SELECT 
        'lost_id_added' as activity_type,
        l.id as item_id,
        l.student_name,
        l.id_type,
        l.created_at as activity_time,
        a.full_name as admin_name
      FROM lost_ids l
      JOIN admins a ON l.added_by = a.id
      WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY l.created_at DESC
      LIMIT ?`,
      [Math.floor(limit / 2)]
    );
    
    // Recent claims processed
    const recentClaims = await executeQuery(
      `SELECT 
        CASE 
          WHEN c.status = 'approved' THEN 'claim_approved'
          WHEN c.status = 'rejected' THEN 'claim_rejected'
          WHEN c.status = 'collected' THEN 'claim_collected'
          ELSE 'claim_submitted'
        END as activity_type,
        c.id as item_id,
        l.student_name,
        l.id_type,
        COALESCE(c.collection_date, c.processed_at, c.claim_date) as activity_time,
        COALESCE(a.full_name, CONCAT(s.first_name, ' ', s.last_name)) as actor_name
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      JOIN students s ON c.claimant_student_id = s.id
      LEFT JOIN admins a ON c.processed_by = a.id
      WHERE COALESCE(c.collection_date, c.processed_at, c.claim_date) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY activity_time DESC
      LIMIT ?`,
      [Math.floor(limit / 2)]
    );
    
    // Combine and sort activities
    const allActivities = [...recentLostIds, ...recentClaims]
      .sort((a, b) => new Date(b.activity_time) - new Date(a.activity_time))
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: allActivities
    });
    
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity feed'
    });
  }
});

// Export statistics as CSV
router.get('/export/csv', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type = 'claims', start_date, end_date } = req.query;
    
    let query = '';
    let params = [];
    let filename = '';
    
    if (type === 'claims') {
      query = `
        SELECT 
          c.id as claim_id,
          c.status,
          c.claim_date,
          c.processed_at,
          c.collection_date,
          l.student_id as lost_student_id,
          l.student_name as lost_student_name,
          l.id_type,
          l.found_date,
          l.found_location,
          s.student_id as claimant_student_id,
          s.first_name as claimant_first_name,
          s.last_name as claimant_last_name,
          s.email as claimant_email,
          a.full_name as processed_by_admin
        FROM claims c
        JOIN lost_ids l ON c.lost_id_id = l.id
        JOIN students s ON c.claimant_student_id = s.id
        LEFT JOIN admins a ON c.processed_by = a.id
        WHERE 1=1
      `;
      filename = 'claims_export.csv';
    } else if (type === 'lost_ids') {
      query = `
        SELECT 
          l.id,
          l.student_id,
          l.student_name,
          l.id_type,
          l.found_date,
          l.found_location,
          l.description,
          l.status,
          l.created_at,
          a.full_name as added_by_admin,
          COUNT(c.id) as total_claims
        FROM lost_ids l
        LEFT JOIN admins a ON l.added_by = a.id
        LEFT JOIN claims c ON l.id = c.lost_id_id
        WHERE 1=1
      `;
      filename = 'lost_ids_export.csv';
    }
    
    // Add date filters if provided
    if (start_date) {
      if (type === 'claims') {
        query += ` AND c.claim_date >= ?`;
      } else {
        query += ` AND l.created_at >= ?`;
      }
      params.push(start_date);
    }
    
    if (end_date) {
      if (type === 'claims') {
        query += ` AND c.claim_date <= ?`;
      } else {
        query += ` AND l.created_at <= ?`;
      }
      params.push(end_date);
    }
    
    if (type === 'lost_ids') {
      query += ` GROUP BY l.id`;
    }
    
    query += ` ORDER BY ${type === 'claims' ? 'c.claim_date' : 'l.created_at'} DESC`;
    
    const results = await executeQuery(query, params);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for export'
      });
    }
    
    // Convert to CSV format
    const headers = Object.keys(results[0]);
    const csvHeaders = headers.join(',');
    const csvRows = results.map(row => 
      headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',')
    );
    
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

// System health check
router.get('/health', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check database connectivity
    const dbCheck = await getOne('SELECT 1 as test');
    
    // Check recent activity
    const recentActivity = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)'
    );
    
    // Check for stuck claims (pending for more than 7 days)
    const stuckClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "pending" AND claim_date < DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    
    // Check approved claims awaiting collection (more than 14 days)
    const overdueCollections = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "approved" AND processed_at < DATE_SUB(NOW(), INTERVAL 14 DAY)'
    );
    
    const healthStatus = {
      database: dbCheck ? 'healthy' : 'error',
      recent_activity: recentActivity.count,
      alerts: {
        stuck_claims: stuckClaims.count,
        overdue_collections: overdueCollections.count
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: healthStatus
    });
    
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      data: {
        database: 'error',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;
