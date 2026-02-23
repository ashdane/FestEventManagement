const express = require('express');
const { createOrganizer } = require('../controllers/admin.controller');
const { extractUserType, isAdmin } = require('../middleware/auth.middleware'); // Ensure paths are correct
const router = express.Router();

router.post('/create-organizer', extractUserType, isAdmin, createOrganizer);
module.exports = router;