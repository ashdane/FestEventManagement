const express = require('express')
const router = express.Router()
const uc = require('../controllers/user.controller')
const { requestReset, getMyRequests } = require('../controllers/reset.controller');
const { extractUserType, isOrganizer } = require('../middleware/auth.middleware');
router.post("/users", uc.save_user)
router.get("/users", uc.get_users)
router.get("/organizers", uc.get_orgs)
router.post('/request-reset', extractUserType, isOrganizer, requestReset);
router.get('/request-reset/history', extractUserType, isOrganizer, getMyRequests);
router.get('/organizer/me', extractUserType, isOrganizer, uc.get_org_details);
router.patch('/organizer/me', extractUserType, isOrganizer, uc.update_org_details);
module.exports = router
