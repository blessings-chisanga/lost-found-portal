import Router from 'express'
import authController from '../Controllers/authController.js'
import { signupValidationRules, validateSignup } from '../MiddleWare/signupValidator.js';

const router = Router();

router.get('/signup', authController.signup_get)
router.post('/signup', signupValidationRules, validateSignup, authController.signup_post)
router.get('/login', authController.login_get)
router.post('/login', authController.login_post)

export default router;