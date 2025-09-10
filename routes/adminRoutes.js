import express from "express";
import {getDashboardStats,
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
  exportCsv,} from "../Controllers/adminController.js"
import { createLostIdv, updateLostIdv, approveClaimv, rejectClaimv, markAsCollectedv, bulkApproveClaimsv } from "../MiddleWare/adminValidator.js";
import { uploadSingleImage } from '../Config/imageUpload.js';
import { requireAdmin } from '../MiddleWare/authMiddleware.js';



const router = express.Router();



// ===== DASHBOARD & STATISTICS ROUTES =====
router.get('/dashboard', requireAdmin, getDashboardStats);
router.get('/trends', requireAdmin, getTrends);
router.get('/stats/id-types', requireAdmin,getIdTypeStats);
router.get('/stats/locations', requireAdmin, getLocationStats);
router.get('/stats/processing-times', requireAdmin,getProcessingTimes);
router.get('/activity', requireAdmin, getActivityFeed);
router.get('/export/csv', requireAdmin, exportCsv);
router.get('/health', requireAdmin, getSystemHealth);

// ===== LOST ID MANAGEMENT ROUTES =====
router.get('/lost-ids', requireAdmin, getAllLostIds);
router.get('/lost-ids/:id', requireAdmin, getLostIdDetails);

// Create lost ID - WITH image upload middleware
router.post('/lost-ids', requireAdmin,
  uploadSingleImage('image'), 
  createLostIdv, createLostId
);

// Update lost ID - WITH image upload middleware
router.put('/lost-ids/:id', requireAdmin,
  uploadSingleImage('image'), 
  updateLostIdv, updateLostId
);

router.delete('/lost-ids/:id', requireAdmin, deleteLostId);

// ===== CLAIMS MANAGEMENT ROUTES =====
router.get('/claims', requireAdmin, getAllClaims);
router.get('/claims/:id', requireAdmin, getClaimDetails);
router.get('/claims/stats/overview', requireAdmin, getClaimsStats);

// Claim actions
router.post('/claims/:id/approve', requireAdmin,
  approveClaimv, 
  approveClaim
);

router.post('/claims/:id/reject', requireAdmin,
  rejectClaimv, 
  rejectClaim
);

router.post('/claims/:id/collect', requireAdmin,
  markAsCollectedv, 
  markAsCollected
);

router.post('/claims/bulk/approve', requireAdmin,
  bulkApproveClaimsv, 
  bulkApproveClaims
);

export default router;