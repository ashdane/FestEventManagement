const express = require('express')
const router = express.Router()
const uc = require('../controllers/user.controller')
const { requestReset } = require('../controllers/reset.controller');

router.post("/users", uc.save_user)
router.get("/users", uc.get_users)
router.get("/organizers", uc.getAllOrganizers)
router.post('/request-reset', extractUserType, isOrganizer, requestReset);
module.exports = router

