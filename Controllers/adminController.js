import pool from "../dB/db.js";
import { body } from "express-validator";
import { validationResult } from "express-validator";
import { executeQuery, getOne } from "../dB/db.js";
import { deleteImage } from "../Config/imageUpload.js";

export const getDashboardStats = async (req, res) => {
  try {
    // Current status counts
    const totalLostIds = await getOne("SELECT COUNT(*) as count FROM lost_ids");
    const availableIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE status = "available"'
    );
    const claimedIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE status = "claimed"'
    );
    const returnedIds = await getOne(
      'SELECT COUNT(*) as count FROM lost_ids WHERE status = "returned"'
    );
    const totalClaims = await getOne("SELECT COUNT(*) as count FROM claims");
    const pendingClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "pending"'
    );
    const totalStudents = await getOne(
      "SELECT COUNT(*) as count FROM students"
    );

    // Recent activity (last 7 days)
    const recentLostIds = await getOne(
      "SELECT COUNT(*) as count FROM lost_ids WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );
    const recentClaims = await getOne(
      "SELECT COUNT(*) as count FROM claims WHERE claim_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );
    const recentCollections = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "collected" AND collection_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    // Success rate calculation
    const completedClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "collected"'
    );
    const successRate =
      totalClaims.count > 0
        ? Math.round((completedClaims.count / totalClaims.count) * 100)
        : 0;

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
          success_rate: successRate,
        },
        recent_activity: {
          new_lost_ids: recentLostIds.count,
          new_claims: recentClaims.count,
          recent_collections: recentCollections.count,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch dashboard statistics" });
  }
};

export const getTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    // Monthly lost IDs added
    const monthlyLostIds = await executeQuery(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
         FROM lost_ids WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month`,
      [months]
    );

    // Monthly claims submitted
    const monthlyClaims = await executeQuery(
      `SELECT DATE_FORMAT(claim_date, '%Y-%m') as month, COUNT(*) as count
         FROM claims WHERE claim_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
         GROUP BY DATE_FORMAT(claim_date, '%Y-%m') ORDER BY month`,
      [months]
    );

    // Monthly collections
    const monthlyCollections = await executeQuery(
      `SELECT DATE_FORMAT(collection_date, '%Y-%m') as month, COUNT(*) as count
         FROM claims WHERE collection_date >= DATE_SUB(NOW(), INTERVAL ? MONTH) AND status = 'collected'
         GROUP BY DATE_FORMAT(collection_date, '%Y-%m') ORDER BY month`,
      [months]
    );

    res.json({
      success: true,
      data: {
        lost_ids: monthlyLostIds,
        claims: monthlyClaims,
        collections: monthlyCollections,
        period_months: parseInt(months),
      },
    });
  } catch (error) {
    console.error("Error fetching trend statistics:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch trend statistics" });
  }
};

export const getIdTypeStats = async (req, res) => {
  try {
    const { period = "all" } = req.query;
    let whereClause = "";
    const params = [];

    if (period !== "all") {
      whereClause = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params.push(period);
    }

    const idTypeStats = await executeQuery(
      `SELECT id_type, COUNT(*) as total_count,
         SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_count,
         SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_count,
         SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_count
         FROM lost_ids ${whereClause} GROUP BY id_type ORDER BY total_count DESC`,
      params
    );

    res.json({ success: true, data: idTypeStats });
  } catch (error) {
    console.error("Error fetching ID type statistics:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch ID type statistics" });
  }
};

export const getLocationStats = async (req, res) => {
  try {
    const { period = "all" } = req.query;
    let whereClause = "";
    const params = [];

    if (period !== "all") {
      whereClause = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params.push(period);
    }

    const locationStats = await executeQuery(
      `SELECT found_location, COUNT(*) as total_count,
         SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_count,
         ROUND((SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as return_rate
         FROM lost_ids ${whereClause} GROUP BY found_location HAVING total_count > 0
         ORDER BY total_count DESC LIMIT 10`,
      params
    );

    res.json({ success: true, data: locationStats });
  } catch (error) {
    console.error("Error fetching location statistics:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch location statistics" });
  }
};

export const getProcessingTimes = async (req, res) => {
  try {
    const processingTimes = await executeQuery(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, claim_date, processed_at)) as avg_processing_hours,
         MIN(TIMESTAMPDIFF(HOUR, claim_date, processed_at)) as min_processing_hours,
         MAX(TIMESTAMPDIFF(HOUR, claim_date, processed_at)) as max_processing_hours,
         COUNT(*) as processed_claims FROM claims 
         WHERE processed_at IS NOT NULL AND claim_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    const collectionTimes = await executeQuery(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, processed_at, collection_date)) as avg_collection_hours,
         MIN(TIMESTAMPDIFF(HOUR, processed_at, collection_date)) as min_collection_hours,
         MAX(TIMESTAMPDIFF(HOUR, processed_at, collection_date)) as max_collection_hours,
         COUNT(*) as collected_claims FROM claims 
         WHERE collection_date IS NOT NULL AND processed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    res.json({
      success: true,
      data: {
        processing: processingTimes[0],
        collection: collectionTimes[0],
      },
    });
  } catch (error) {
    console.error("Error fetching processing time statistics:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to fetch processing time statistics",
      });
  }
};

export const getActivityFeed = async (req, res) => {
    try {
      // Convert limit to integer and provide default
      const limit = parseInt(req.query.limit) || 20;
      const halfLimit = Math.floor(limit / 2);
      
      // Recent lost IDs added
      const recentLostIds = await executeQuery(
        `SELECT 'lost_id_added' as activity_type, l.id as item_id, l.student_name, l.id_type,
         l.created_at as activity_time, a.full_name as admin_name
         FROM lost_ids l JOIN admins a ON l.added_by = a.id
         WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY l.created_at DESC LIMIT ${halfLimit}`
      );
      
      // Recent claims processed
      const recentClaims = await executeQuery(
        `SELECT CASE 
           WHEN c.status = 'approved' THEN 'claim_approved'
           WHEN c.status = 'rejected' THEN 'claim_rejected'
           WHEN c.status = 'collected' THEN 'claim_collected'
           ELSE 'claim_submitted' END as activity_type,
         c.id as item_id, l.student_name, l.id_type,
         COALESCE(c.collection_date, c.processed_at, c.claim_date) as activity_time,
         COALESCE(a.full_name, CONCAT(s.first_name, ' ', s.last_name)) as actor_name
         FROM claims c JOIN lost_ids l ON c.lost_id_id = l.id
         JOIN students s ON c.claimant_student_id = s.id
         LEFT JOIN admins a ON c.processed_by = a.id
         WHERE COALESCE(c.collection_date, c.processed_at, c.claim_date) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY activity_time DESC LIMIT ${halfLimit}`
      );
      
      // Combine and sort activities
      const allActivities = [...recentLostIds, ...recentClaims]
        .sort((a, b) => new Date(b.activity_time) - new Date(a.activity_time))
        .slice(0, limit);
      
      res.json({ success: true, data: allActivities });
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch activity feed' });
    }
}

export const exportCsv = async (req, res) => {
  try {
    const { type = "claims", start_date, end_date } = req.query;
    let query = "";
    let params = [];
    let filename = "";

    if (type === "claims") {
      query = `SELECT c.id as claim_id, c.status, c.claim_date, c.processed_at, c.collection_date,
                 l.student_id as lost_student_id, l.student_name as lost_student_name, l.id_type,
                 l.found_date, l.found_location, s.student_id as claimant_student_id,
                 s.first_name as claimant_first_name, s.last_name as claimant_last_name,
                 s.email as claimant_email, a.full_name as processed_by_admin
                 FROM claims c JOIN lost_ids l ON c.lost_id_id = l.id
                 JOIN students s ON c.claimant_student_id = s.id
                 LEFT JOIN admins a ON c.processed_by = a.id WHERE 1=1`;
      filename = "claims_export.csv";
    } else if (type === "lost_ids") {
      query = `SELECT l.id, l.student_id, l.student_name, l.id_type, l.found_date,
                 l.found_location, l.description, l.status, l.created_at,
                 a.full_name as added_by_admin, COUNT(c.id) as total_claims
                 FROM lost_ids l LEFT JOIN admins a ON l.added_by = a.id
                 LEFT JOIN claims c ON l.id = c.lost_id_id WHERE 1=1`;
      filename = "lost_ids_export.csv";
    }

    // Add date filters if provided
    if (start_date) {
      query +=
        type === "claims" ? ` AND c.claim_date >= ?` : ` AND l.created_at >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      query +=
        type === "claims" ? ` AND c.claim_date <= ?` : ` AND l.created_at <= ?`;
      params.push(end_date);
    }

    if (type === "lost_ids") query += ` GROUP BY l.id`;
    query += ` ORDER BY ${
      type === "claims" ? "c.claim_date" : "l.created_at"
    } DESC`;

    const results = await executeQuery(query, params);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No data found for export" });
    }

    // Convert to CSV format
    const headers = Object.keys(results[0]);
    const csvHeaders = headers.join(",");
    const csvRows = results.map((row) =>
      headers
        .map((header) => {
          let value = row[header];
          if (value === null || value === undefined) return "";
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        })
        .join(",")
    );

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).json({ success: false, error: "Failed to export data" });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    const dbCheck = await getOne("SELECT 1 as test");
    const recentActivity = await getOne(
      "SELECT COUNT(*) as count FROM lost_ids WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)"
    );
    const stuckClaims = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "pending" AND claim_date < DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    const overdueCollections = await getOne(
      'SELECT COUNT(*) as count FROM claims WHERE status = "approved" AND processed_at < DATE_SUB(NOW(), INTERVAL 14 DAY)'
    );

    const healthStatus = {
      database: dbCheck ? "healthy" : "error",
      recent_activity: recentActivity.count,
      alerts: {
        stuck_claims: stuckClaims.count,
        overdue_collections: overdueCollections.count,
      },
      timestamp: new Date().toISOString(),
    };

    res.json({ success: true, data: healthStatus });
  } catch (error) {
    console.error("Error checking system health:", error);
    res.status(500).json({
      success: false,
      error: "Health check failed",
      data: { database: "error", timestamp: new Date().toISOString() },
    });
  }
};

// ===== LOST ID MANAGEMENT =====

export const getAllLostIds = async (req, res) => {
  try {
    const { search, status, id_type, page = 1, limit = 20 } = req.query;

    let query = `SELECT l.id, l.student_id, l.student_name, l.id_type, l.found_date, 
                   l.found_location, l.description, l.image_url, l.status, l.created_at, l.updated_at,
                   a.full_name as added_by_admin, COUNT(c.id) as claims_count
                   FROM lost_ids l LEFT JOIN admins a ON l.added_by = a.id
                   LEFT JOIN claims c ON l.id = c.lost_id_id WHERE 1=1`;

    const params = [];

    if (search) {
      query += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR l.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (status && status !== "all") {
      query += ` AND l.status = ?`;
      params.push(status);
    }
    if (id_type && id_type !== "all") {
      query += ` AND l.id_type = ?`;
      params.push(id_type);
    }

    query += ` GROUP BY l.id ORDER BY l.created_at DESC`;

    // Convert to integers and use string interpolation for LIMIT/OFFSET
    const limitInt = parseInt(limit) || 20;
    const pageInt = parseInt(page) || 1;
    const offset = (pageInt - 1) * limitInt;
    
    query += ` LIMIT ${limitInt} OFFSET ${offset}`;
    // Note: removed limit and offset from params array since we're using string interpolation

    const lostIds = await executeQuery(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT l.id) as total FROM lost_ids l WHERE 1=1`;
    const countParams = [];

    if (search) {
      countQuery += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR l.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (status && status !== "all") {
      countQuery += ` AND l.status = ?`;
      countParams.push(status);
    }
    if (id_type && id_type !== "all") {
      countQuery += ` AND l.id_type = ?`;
      countParams.push(id_type);
    }

    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: lostIds,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt,
      },
    });
  } catch (error) {
    console.error("Error fetching lost IDs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch lost IDs" });
  }
};

export const createLostId = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const {
      student_id,
      student_name,
      id_type,
      found_date,
      found_location,
      description,
    } = req.body;
    const adminId = req.admin.id;

    // Handle image data
    let imageData = {};
    if (req.processedImage) {
      imageData = {
        image_filename: req.processedImage.filename,
        image_path: req.processedImage.path,
        image_url: req.processedImage.url,
        image_size: req.processedImage.size,
        image_mimetype: req.processedImage.mimetype,
      };
    }

    // Create lost ID entry
    const result = await executeQuery(
      `INSERT INTO lost_ids 
         (student_id, student_name, id_type, found_date, found_location, description, 
          image_filename, image_path, image_url, image_size, image_mimetype, added_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        student_name,
        id_type,
        found_date,
        found_location,
        description || null,
        imageData.image_filename || null,
        imageData.image_path || null,
        imageData.image_url || null,
        imageData.image_size || null,
        imageData.image_mimetype || null,
        adminId,
      ]
    );

    // Get created record
    const newLostId = await getOne(
      `SELECT l.*, a.full_name as added_by_admin FROM lost_ids l 
         LEFT JOIN admins a ON l.added_by = a.id WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Lost ID added successfully",
      data: newLostId,
    });
  } catch (error) {
    console.error("Error creating lost ID:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create lost ID entry" });
  }
};

export const updateLostId = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { id } = req.params;

    // Check if lost ID exists
    const existingLostId = await getOne("SELECT * FROM lost_ids WHERE id = ?", [
      id,
    ]);
    if (!existingLostId) {
      return res
        .status(404)
        .json({ success: false, error: "Lost ID not found" });
    }

    // Build update query
    const updates = [];
    const params = [];

    Object.keys(req.body).forEach((key) => {
      if (
        req.body[key] !== undefined &&
        [
          "student_id",
          "student_name",
          "id_type",
          "found_date",
          "found_location",
          "description",
        ].includes(key)
      ) {
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

      updates.push(
        "image_filename = ?",
        "image_path = ?",
        "image_url = ?",
        "image_size = ?",
        "image_mimetype = ?"
      );
      params.push(
        req.processedImage.filename,
        req.processedImage.path,
        req.processedImage.url,
        req.processedImage.size,
        req.processedImage.mimetype
      );
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No valid fields to update" });
    }

    // Update the record
    params.push(id);
    await executeQuery(
      `UPDATE lost_ids SET ${updates.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    // Get updated record
    const updatedLostId = await getOne(
      `SELECT l.*, a.full_name as added_by_admin FROM lost_ids l 
         LEFT JOIN admins a ON l.added_by = a.id WHERE l.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Lost ID updated successfully",
      data: updatedLostId,
    });
  } catch (error) {
    console.error("Error updating lost ID:", error);
    res.status(500).json({ success: false, error: "Failed to update lost ID" });
  }
};

export const deleteLostId = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if lost ID exists
    const lostId = await getOne("SELECT * FROM lost_ids WHERE id = ?", [id]);
    if (!lostId) {
      return res
        .status(404)
        .json({ success: false, error: "Lost ID not found" });
    }

    // Check if there are pending claims
    const pendingClaims = await executeQuery(
      'SELECT COUNT(*) as count FROM claims WHERE lost_id_id = ? AND status = "pending"',
      [id]
    );

    if (pendingClaims[0].count > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot delete lost ID with pending claims. Process claims first.",
      });
    }

    // Delete associated claims first
    await executeQuery("DELETE FROM claims WHERE lost_id_id = ?", [id]);

    // Delete image if exists
    if (lostId.image_filename) {
      await deleteImage(lostId.image_filename);
    }

    // Delete the lost ID
    await executeQuery("DELETE FROM lost_ids WHERE id = ?", [id]);

    res.json({ success: true, message: "Lost ID deleted successfully" });
  } catch (error) {
    console.error("Error deleting lost ID:", error);
    res.status(500).json({ success: false, error: "Failed to delete lost ID" });
  }
};

export const getLostIdDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const lostId = await getOne(
      `SELECT l.*, a.full_name as added_by_admin FROM lost_ids l 
         LEFT JOIN admins a ON l.added_by = a.id WHERE l.id = ?`,
      [id]
    );

    if (!lostId) {
      return res
        .status(404)
        .json({ success: false, error: "Lost ID not found" });
    }

    // Get associated claims
    const claims = await executeQuery(
      `SELECT c.id, c.verification_details, c.status, c.claim_date, c.admin_notes,
         s.first_name, s.last_name, s.student_id, s.email FROM claims c
         JOIN students s ON c.claimant_student_id = s.id WHERE c.lost_id_id = ?
         ORDER BY c.claim_date DESC`,
      [id]
    );

    res.json({ success: true, data: { ...lostId, claims } });
  } catch (error) {
    console.error("Error fetching lost ID details:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch lost ID details" });
  }
};

// ===== CLAIMS MANAGEMENT =====

export const getAllClaims = async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = "claim_date",
      sortOrder = "DESC",
    } = req.query;

    let query = `SELECT c.id, c.lost_id_id, c.verification_details, c.status, c.claim_date,
                   c.admin_notes, c.processed_at, c.collection_date,
                   l.student_id as lost_student_id, l.student_name as lost_student_name, 
                   l.id_type, l.found_date, l.found_location, l.image_url,
                   s.student_id as claimant_student_id, s.first_name, s.last_name, s.email, s.phone,
                   a.full_name as processed_by_admin FROM claims c
                   JOIN lost_ids l ON c.lost_id_id = l.id JOIN students s ON c.claimant_student_id = s.id
                   LEFT JOIN admins a ON c.processed_by = a.id WHERE 1=1`;

    const params = [];

    // Add filters
    if (status && status !== "all") {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add sorting
    const allowedSortFields = [
      "claim_date",
      "status",
      "lost_student_name",
      "found_date",
    ];
    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "claim_date";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    if (sortField === "lost_student_name") {
      query += ` ORDER BY l.student_name ${order}`;
    } else if (sortField === "found_date") {
      query += ` ORDER BY l.found_date ${order}`;
    } else {
      query += ` ORDER BY c.${sortField} ${order}`;
    }

    // Add pagination - using string interpolation for LIMIT/OFFSET
    const limitInt = parseInt(limit) || 20;
    const pageInt = parseInt(page) || 1;
    const offset = (pageInt - 1) * limitInt;
    
    query += ` LIMIT ${limitInt} OFFSET ${offset}`;
    // Note: removed limit and offset from params array

    const claims = await executeQuery(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM claims c
                        JOIN lost_ids l ON c.lost_id_id = l.id JOIN students s ON c.claimant_student_id = s.id
                        WHERE 1=1`;
    const countParams = [];

    if (status && status !== "all") {
      countQuery += ` AND c.status = ?`;
      countParams.push(status);
    }
    if (search) {
      countQuery += ` AND (l.student_name LIKE ? OR l.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm
      );
    }

    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: claims,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt,
      },
    });
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ success: false, error: "Failed to fetch claims" });
  }
};

export const getClaimDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const claim = await getOne(
      `SELECT c.id, c.lost_id_id, c.verification_details, c.status, c.claim_date,
         c.admin_notes, c.processed_at, c.collection_date,
         l.student_id as lost_student_id, l.student_name as lost_student_name, 
         l.id_type, l.found_date, l.found_location, l.description, l.image_url,
         s.student_id as claimant_student_id, s.first_name, s.last_name, s.email, s.phone,
         a.full_name as processed_by_admin FROM claims c
         JOIN lost_ids l ON c.lost_id_id = l.id JOIN students s ON c.claimant_student_id = s.id
         LEFT JOIN admins a ON c.processed_by = a.id WHERE c.id = ?`,
      [id]
    );

    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    console.error("Error fetching claim details:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch claim details" });
  }
};

export const approveClaim = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.admin.id;

    // Check if claim exists and is pending
    const claim = await getOne(
      "SELECT id, lost_id_id, status FROM claims WHERE id = ?",
      [id]
    );

    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    if (claim.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, error: "Only pending claims can be approved" });
    }

    // Update claim status to approved
    await executeQuery(
      `UPDATE claims SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [admin_notes || "Claim approved - ID ready for collection", adminId, id]
    );

    // Get updated claim details
    const updatedClaim = await getOne(
      `SELECT c.*, l.student_name as lost_student_name, l.id_type, s.first_name, s.last_name, s.email
         FROM claims c JOIN lost_ids l ON c.lost_id_id = l.id JOIN students s ON c.claimant_student_id = s.id
         WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message:
        "Claim approved successfully. Student will be notified to collect their ID.",
      data: updatedClaim,
    });
  } catch (error) {
    console.error("Error approving claim:", error);
    res.status(500).json({ success: false, error: "Failed to approve claim" });
  }
};

export const rejectClaim = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.admin.id;

    // Check if claim exists and is pending
    const claim = await getOne(
      "SELECT id, lost_id_id, status FROM claims WHERE id = ?",
      [id]
    );

    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    if (claim.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, error: "Only pending claims can be rejected" });
    }

    // Update claim status to rejected
    await executeQuery(
      `UPDATE claims SET status = 'rejected', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [admin_notes, adminId, id]
    );

    // Update lost ID status back to available
    await executeQuery(
      'UPDATE lost_ids SET status = "available" WHERE id = ?',
      [claim.lost_id_id]
    );

    // Get updated claim details
    const updatedClaim = await getOne(
      `SELECT c.*, l.student_name as lost_student_name, l.id_type, s.first_name, s.last_name, s.email
         FROM claims c JOIN lost_ids l ON c.lost_id_id = l.id JOIN students s ON c.claimant_student_id = s.id
         WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message:
        "Claim rejected successfully. Lost ID is now available for other claims.",
      data: updatedClaim,
    });
  } catch (error) {
    console.error("Error rejecting claim:", error);
    res.status(500).json({ success: false, error: "Failed to reject claim" });
  }
};

export const markAsCollected = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.admin.id;

    // Check if claim exists and is approved
    const claim = await getOne(
      "SELECT id, lost_id_id, status FROM claims WHERE id = ?",
      [id]
    );

    if (!claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    if (claim.status !== "approved") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Only approved claims can be marked as collected",
        });
    }

    // Update claim status to collected
    await executeQuery(
      `UPDATE claims SET status = 'collected', admin_notes = ?, processed_by = ?, collection_date = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        admin_notes || "ID successfully collected by verified owner",
        adminId,
        id,
      ]
    );

    // Update lost ID status to returned
    await executeQuery('UPDATE lost_ids SET status = "returned" WHERE id = ?', [
      claim.lost_id_id,
    ]);

    // Get updated claim details
    const updatedClaim = await getOne(
      `SELECT c.*, l.student_name as lost_student_name, l.id_type, s.first_name, s.last_name, s.email
         FROM claims c JOIN lost_ids l ON c.lost_id_id = l.id JOIN students s ON c.claimant_student_id = s.id
         WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "ID collection confirmed successfully.",
      data: updatedClaim,
    });
  } catch (error) {
    console.error("Error marking claim as collected:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark claim as collected" });
  }
};

export const bulkApproveClaims = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { claim_ids, admin_notes } = req.body;
    const adminId = req.user.id;

    if (claim_ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No claims selected" });
    }

    // Check all claims are pending
    const placeholders = claim_ids.map(() => "?").join(",");
    const pendingClaims = await executeQuery(
      `SELECT id FROM claims WHERE id IN (${placeholders}) AND status = 'pending'`,
      claim_ids
    );

    if (pendingClaims.length !== claim_ids.length) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Some claims are not in pending status",
        });
    }

    // Bulk approve
    await executeQuery(
      `UPDATE claims SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP 
         WHERE id IN (${placeholders})`,
      [
        admin_notes || "Bulk approved - IDs ready for collection",
        adminId,
        ...claim_ids,
      ]
    );

    res.json({
      success: true,
      message: `${claim_ids.length} claims approved successfully`,
    });
  } catch (error) {
    console.error("Error bulk approving claims:", error);
    res.status(500).json({ success: false, error: "Failed to approve claims" });
  }
};

export const getClaimsStats = async (req, res) => {
  try {
    const { period = "30" } = req.query; // days

    // Basic counts
    const totalClaims = await getOne(
      "SELECT COUNT(*) as count FROM claims WHERE claim_date >= DATE_SUB(NOW(), INTERVAL ? DAY)",
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
      `SELECT DATE(claim_date) as date, COUNT(*) as claims_count,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
         SUM(CASE WHEN status = 'collected' THEN 1 ELSE 0 END) as collected_count
         FROM claims WHERE claim_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY DATE(claim_date) ORDER BY date DESC`
    );

    // ID type distribution
    const idTypeStats = await executeQuery(
      `SELECT l.id_type, COUNT(c.id) as claims_count FROM claims c
         JOIN lost_ids l ON c.lost_id_id = l.id WHERE c.claim_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
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
          success_rate:
            totalClaims.count > 0
              ? Math.round((collectedClaims.count / totalClaims.count) * 100)
              : 0,
        },
        daily_stats: dailyStats,
        id_type_distribution: idTypeStats,
        period_days: parseInt(period),
      },
    });
  } catch (error) {
    console.error("Error fetching claims statistics:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch statistics" });
  }
};

export default {
  getDashboardStats,
  getTrends,
  getSystemHealth,
  getProcessingTimes,
  getActivityFeed,
  getIdTypeStats,
  getLocationStats,
  getAllLostIds,
  createLostId,
  updateLostId,
  deleteLostId,
  getLostIdDetails,
  getAllClaims,
  getClaimDetails,
  approveClaim,
  rejectClaim,
  markAsCollected,
  bulkApproveClaims,
  getClaimsStats,
  exportCsv,
};
