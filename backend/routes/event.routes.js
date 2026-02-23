const express = require('express');
const {
    manageEventLifecycle,
    manageOrganizerEvents,
    manageEventForm,
    getEventDiscovery,
    handleRegistration
} = require('../controllers/event.controller');
const { extractUserType, isOrganizer, isParticipant } = require('../middleware/auth.middleware');
const router = express.Router();

router.post('/', extractUserType, isOrganizer, manageEventLifecycle);
router.get('/organizer/my-events', extractUserType, isOrganizer, manageOrganizerEvents);
router.get('/organizer/dashboard-summary', extractUserType, isOrganizer, manageOrganizerEvents);
router.get('/organizer/:eventId', extractUserType, isOrganizer, manageOrganizerEvents);
router.patch('/organizer/:eventId', extractUserType, isOrganizer, manageEventLifecycle);
router.patch('/organizer/:eventId/publish', extractUserType, isOrganizer, manageEventLifecycle);
router.get('/organizer/:eventId/form', extractUserType, isOrganizer, manageEventForm);
router.put('/organizer/:eventId/form', extractUserType, isOrganizer, manageEventForm);

router.get('/', extractUserType, isParticipant, getEventDiscovery);
router.get('/my-dashboard', extractUserType, isParticipant, handleRegistration);
router.get('/:eventId', extractUserType, isParticipant, getEventDiscovery);
router.post('/:eventId/register', extractUserType, isParticipant, handleRegistration);
module.exports = router;
