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
const { purchaseMerchandise, approvePayment, rejectPayment } = require('../controllers/merchandise.controller');
const upload = require('../middleware/upload.middleware');
const { scanTicket, getAttendanceStats } = require('../controllers/attendance.controller');

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

router.post(
    '/merchandise/purchase', 
    extractUserType, 
    isParticipant, 
    upload.single('paymentProof'), // Intercepts the image, uploads to Cloudinary, attaches req.file.path
    purchaseMerchandise
);

// Organizer approves a pending merchandise payment
router.put(
    '/merchandise/approve/:ticketId', 
    extractUserType, 
    isOrganizer, 
    approvePayment
);

// Organizer rejects a pending merchandise payment
router.put(
    '/merchandise/reject/:ticketId', 
    extractUserType, 
    isOrganizer, 
    rejectPayment
);
router.put(
    '/attendance/scan', 
    extractUserType, 
    isOrganizer, 
    scanTicket
);

// Organizer views live stats for an event
router.get(
    '/attendance/stats/:eventId', 
    extractUserType, 
    isOrganizer, 
    getAttendanceStats
);
module.exports = router;
