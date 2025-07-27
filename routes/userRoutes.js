import Router from 'express'
import {fetchLostIds} from '../Controllers/userController.js'
import { requireAuth } from '../MiddleWare/authMiddleware.js'

const router = Router();

router.get("/fetchIds",requireAuth,fetchLostIds);

export default router;

