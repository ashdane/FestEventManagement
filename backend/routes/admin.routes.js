const express = require('express');
const { createOrg, getOrgs, disableOrg, enableOrg, archiveOrg, removeOrg } = require('../controllers/admin.controller');
const { extractUserType, isAdmin } = require('../middleware/auth.middleware'); // Ensure paths are correct
const router = express.Router();
const { getAllRequests, approveReset, rejectReset, getPrevResets } = require('../controllers/reset.controller');
router.post('/create-organizer', extractUserType, isAdmin, createOrg);
router.get('/organizers', extractUserType, isAdmin, getOrgs);
router.patch('/organizers/:organizerId/disable', extractUserType, isAdmin, disableOrg);
router.patch('/organizers/:organizerId/enable', extractUserType, isAdmin, enableOrg);
router.patch('/organizers/:organizerId/archive', extractUserType, isAdmin, archiveOrg);
router.delete('/organizers/:organizerId', extractUserType, isAdmin, removeOrg);
router.get('/resets', extractUserType, isAdmin, getAllRequests);
router.put('/resets/approve/:requestId', extractUserType, isAdmin, approveReset);
router.put('/resets/reject/:requestId', extractUserType, isAdmin, rejectReset);
router.get('/resets/history', extractUserType, isAdmin, getPrevResets);
module.exports = router;
