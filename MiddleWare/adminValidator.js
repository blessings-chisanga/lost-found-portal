import { body } from "express-validator";
import { validationResult } from "express-validator";


  export const createLostIdv = [
    body('student_id').notEmpty().withMessage('Student ID is required'),
    body('student_name').notEmpty().withMessage('Student name is required'),
    body('id_type').isIn(['student_id', 'government_issued', 'other']).withMessage('Valid ID type required'),
    body('found_date').isDate().withMessage('Valid found date required'),
    body('found_location').notEmpty().withMessage('Found location is required')
  ]
  
  export const updateLostIdv = [
    body('student_id').optional().notEmpty().withMessage('Student ID cannot be empty'),
    body('student_name').optional().notEmpty().withMessage('Student name cannot be empty'),
    body('id_type').optional().isIn(['student_id', 'government_issued', 'other']).withMessage('Valid ID type required'),
    body('found_date').optional().isDate().withMessage('Valid found date required'),
    body('found_location').optional().notEmpty().withMessage('Found location cannot be empty')
  ]
  
  export const approveClaimv = [
    body('admin_notes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
  ]
  
  export const rejectClaimv = [
    body('admin_notes').notEmpty().withMessage('Rejection reason is required')
  ]
  
  export const markAsCollectedv = [
    body('admin_notes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
  ]
  
  export const bulkApproveClaimsv =[
    body('claim_ids').isArray().withMessage('claim_ids must be an array'),
    body('admin_notes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
  ]
