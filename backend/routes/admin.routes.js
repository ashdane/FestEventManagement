const express = require('express');
const { createOrganizer } = require('../controllers/admin.controller');
const { extractUserType, isAdmin } = require('../middleware/auth.middleware'); // Ensure paths are correct
const router = express.Router();
const { getAllRequests, approveReset } = require('../controllers/reset.controller');
router.post('/create-organizer', extractUserType, isAdmin, createOrganizer);
router.get('/resets', extractUserType, isAdmin, getAllRequests);
router.put('/resets/approve/:requestId', extractUserType, isAdmin, approveReset);
module.exports = router;
