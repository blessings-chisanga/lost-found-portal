import Router from 'express'
import authController, { Adminlogout, Adminlogin} from '../Controllers/authController.js'
import { signupValidationRules, validateSignup } from '../MiddleWare/signupValidator.js'
import { requireAuth, requireAdmin } from '../MiddleWare/authMiddleware.js'


const router = Router();

router.get('/signup', authController.signup_get)
router.post('/signup', signupValidationRules, validateSignup, authController.signup_post)
router.get('/login', authController.login_get)
router.post('/login', authController.login_post)
router.get("/logout", authController.logout_get);


// Check user login status
router.get("/auth/check", requireAuth, (req, res) => {
    res.json({ success: true, student_id: req.user.student_id });
});

// Admin login
router.post("/admin/login", Adminlogin);
router.get("/admin/logout", Adminlogout)


// Check admin login status
router.get("/admin/auth/check", requireAdmin, (req, res) => {
  res.json({
    success: true,
    admin_id: req.admin.id,
    role: req.admin.role,
  });
});

export default router;