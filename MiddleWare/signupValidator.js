import {body, validationResult} from 'express-validator'

export const signupValidationRules = [
  body('student_id')
    .trim()
    .notEmpty().withMessage('A valid Unza Student ID is required')
    .isLength({ min: 10 }).withMessage('Student ID must be at least 10 characters long'),

  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isAlpha().withMessage('First name must contain only letters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isAlpha().withMessage('Last name must contain only letters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\d{10,}$/).withMessage('Phone number must be at least 10 digits'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
]

// Middleware to check for validation results
export const validateSignup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  };
