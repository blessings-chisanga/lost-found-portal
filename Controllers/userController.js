import pool from "../dB/db.js";

// -------------------- LOST IDS --------------------

// Get all available lost IDs with search and pagination
export const getLostIds = async (req, res) => {
  try {
    const { search, id_type, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT 
        id, student_id, student_name, id_type, found_date, 
        found_location, description, image_url, status, created_at
      FROM lost_ids
      WHERE status = 'available'
    `;

    const params = [];

    if (search) {
      query += ` AND (student_name LIKE ? OR student_id LIKE ? OR description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (id_type && id_type !== "all") {
      query += ` AND id_type = ?`;
      params.push(id_type);
    }

    query += ` ORDER BY found_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), parseInt(offset));

    const [lostIds] = await pool.query(query, params);

    // Count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM lost_ids
      WHERE status = 'available'
    `;
    const countParams = [];
    if (search) {
      countQuery += ` AND (student_name LIKE ? OR student_id LIKE ? OR description LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (id_type && id_type !== "all") {
      countQuery += ` AND id_type = ?`;
      countParams.push(id_type);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: lostIds,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching lost IDs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch lost IDs" });
  }
};

// Get details of a single lost ID
export const getLostIdDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT id, student_id, student_name, id_type, found_date, 
              found_location, description, image_url, status, created_at
       FROM lost_ids
       WHERE id = ? AND status = 'available'`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Lost ID not found or no longer available",
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching lost ID details:", error);
    res.status(500).json({ success: false, error: "Failed to fetch lost ID details" });
  }
};

// Search suggestions
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const [suggestions] = await pool.query(
      `SELECT DISTINCT student_name, student_id
       FROM lost_ids
       WHERE status = 'available' AND (student_name LIKE ? OR student_id LIKE ?)
       LIMIT 10`,
      [`%${q}%`, `%${q}%`]
    );

    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Error getting search suggestions:", error);
    res.status(500).json({ success: false, error: "Failed to get search suggestions" });
  }
};

// ID Types for filter dropdown
export const getIdTypes = async (req, res) => {
  try {
    const [idTypes] = await pool.query(
      `SELECT DISTINCT id_type, COUNT(*) as count
       FROM lost_ids
       WHERE status = 'available'
       GROUP BY id_type
       ORDER BY count DESC`
    );

    res.json({ success: true, data: idTypes });
  } catch (error) {
    console.error("Error fetching ID types:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ID types" });
  }
};

// -------------------- CLAIMS --------------------

// Submit a new claim 

export const submitClaim = async (req, res) => {
  try {
    const { lost_id_id, verification_details } = req.body;

    if (!lost_id_id || !verification_details || verification_details.length < 10) {
      return res.status(400).json({ success: false, error: "Invalid claim data" });
    }

    // Get numeric student ID (primary key) from students table
    const [studentRows] = await pool.query(
      "SELECT id FROM students WHERE student_id = ?",
      [req.user.student_id]
    );

    if (studentRows.length === 0) {
      return res.status(400).json({ success: false, error: "Student not found" });
    }

    const claimant_student_id = studentRows[0].id;

    // Check if lost ID exists and is available
    const [lostIdRows] = await pool.query(
      "SELECT id, status FROM lost_ids WHERE id = ?",
      [lost_id_id]
    );

    if (lostIdRows.length === 0) {
      return res.status(404).json({ success: false, error: "Lost ID not found" });
    }

    if (lostIdRows[0].status !== "available") {
      return res.status(400).json({ success: false, error: "This ID is no longer available" });
    }

    // Check for duplicate claim
    const [existingClaims] = await pool.query(
      "SELECT id FROM claims WHERE lost_id_id = ? AND claimant_student_id = ?",
      [lost_id_id, claimant_student_id]
    );

    if (existingClaims.length > 0) {
      return res.status(400).json({ success: false, error: "You already claimed this ID" });
    }

    // Insert claim
    const [result] = await pool.query(
      `INSERT INTO claims (lost_id_id, claimant_student_id, verification_details, status)
       VALUES (?, ?, ?, 'pending')`,
      [lost_id_id, claimant_student_id, verification_details]
    );

    // Mark lost ID as claimed
    await pool.query("UPDATE lost_ids SET status = 'claimed' WHERE id = ?", [lost_id_id]);

    res.status(201).json({
      success: true,
      message: "Claim submitted successfully. Please wait for admin approval.",
      claimId: result.insertId,
    });
  } catch (error) {
    console.error("Error submitting claim:", error);
    res.status(500).json({ success: false, error: "Failed to submit claim" });
  }
};


// Get user's claims

export const getMyClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const studentIdStr = req.user.student_id; // e.g., '2021379567'

    // Get numeric student id
    const [studentRows] = await pool.query(
      "SELECT id FROM students WHERE student_id = ?",
      [studentIdStr]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const userId = studentRows[0].id; // numeric id to match claimant_student_id

    let query = `
      SELECT c.id, c.lost_id_id, c.verification_details, c.status,
             c.claim_date, c.admin_notes, c.processed_at, c.collection_date,
             l.student_id, l.student_name, l.id_type, l.found_date, 
             l.found_location, l.description, l.image_url
      FROM claims c
      JOIN lost_ids l ON c.lost_id_id = l.id
      WHERE c.claimant_student_id = ?
    `;
    const params = [userId];

    if (status && status !== "all") {
      query += " AND c.status = ?";
      params.push(status);
    }

    query += " ORDER BY c.claim_date DESC LIMIT ? OFFSET ?";
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), parseInt(offset));

    const [claims] = await pool.query(query, params);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM claims WHERE claimant_student_id = ?`,
      [userId]
    );
    const total = countRows[0].total;

    res.json({
      success: true,
      data: claims,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ success: false, error: "Failed to fetch claims" });
  }
};


// Get claim details
export const getClaimDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const studentIdStr = req.user.student_id; // from JWT

    // Get numeric student id
    const [studentRows] = await pool.query(
      "SELECT id FROM students WHERE student_id = ?",
      [studentIdStr]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const userId = studentRows[0].id;

    const [rows] = await pool.query(
      `SELECT c.id, c.lost_id_id, c.verification_details, c.status,
              c.claim_date, c.admin_notes, c.processed_at, c.collection_date,
              l.student_id, l.student_name, l.id_type, l.found_date, 
              l.found_location, l.description, l.image_url
       FROM claims c
       JOIN lost_ids l ON c.lost_id_id = l.id
       WHERE c.id = ? AND c.claimant_student_id = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching claim details:", error);
    res.status(500).json({ success: false, error: "Failed to fetch claim details" });
  }
};

// Cancel a pending claim
export const cancelClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const studentIdStr = req.user.student_id; // from JWT

    // Lookup numeric student ID
    const [studentRows] = await pool.query(
      "SELECT id FROM students WHERE student_id = ?",
      [studentIdStr]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const userId = studentRows[0].id;

    const [rows] = await pool.query(
      "SELECT id, lost_id_id, status FROM claims WHERE id = ? AND claimant_student_id = ?",
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    if (rows[0].status !== "pending") {
      return res.status(400).json({ success: false, error: "Only pending claims can be cancelled" });
    }

    await pool.query("DELETE FROM claims WHERE id = ?", [id]);
    await pool.query("UPDATE lost_ids SET status = 'available' WHERE id = ?", [rows[0].lost_id_id]);

    res.json({ success: true, message: "Claim cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling claim:", error);
    res.status(500).json({ success: false, error: "Failed to cancel claim" });
  }
};




export default {
    getLostIds,
    getLostIdDetails,
    getSearchSuggestions,
    getIdTypes,
    submitClaim,
    getMyClaims,
    getClaimDetails,
    cancelClaim
};