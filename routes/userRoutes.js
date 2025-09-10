import Router from 'express'
import { getLostIds,
  getLostIdDetails,
  getSearchSuggestions,
  getIdTypes,
  submitClaim,
  getMyClaims,
  getClaimDetails,
  cancelClaim,} from '../Controllers/userController.js'
import { requireAuth } from '../MiddleWare/authMiddleware.js'

const router = Router();

// Lost IDs endpoints
router.get("/lost-ids", requireAuth, getLostIds);
router.get("/lost-ids/:id", requireAuth, getLostIdDetails);
router.get("/lost-ids/search/suggestions", requireAuth, getSearchSuggestions);
router.get("/lost-ids/meta/id-types", requireAuth, getIdTypes);

// Claims endpoints
router.post("/claims", requireAuth, submitClaim);
router.get("/claims/my-claims", requireAuth, getMyClaims);
router.get("/claims/:id", requireAuth, getClaimDetails);
router.delete("/claims/:id", requireAuth, cancelClaim);

export default router;

