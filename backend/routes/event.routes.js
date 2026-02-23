const express = require('express');
const {
    manageEventLifecycle,
    manageOrganizerEvents,
    manageEventForm,
    getEventDiscovery,
    handleRegistration,
    getMyCalendarLinks,
    exportCalendarIcs
} = require('../controllers/event.controller');
const { extractUserType, isOrganizer, isParticipant } = require('../middleware/auth.middleware');
const router = express.Router();
const { buyMerch, approvePayment, rejectPayment } = require('../controllers/merchandise.controller');
const upload = require('../middleware/upload.middleware');
const { scanTicket, getAttendanceStats, getAttendanceDashboard, exportAttendanceCsv, manualOverrideAttendance, getAttendanceAudit } = require('../controllers/attendance.controller');
const { getForum, postMessage, reactMessage, pinMessage, deleteMessage, getNotifications } = require('../controllers/forum.controller');
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
router.get('/calendar/links', extractUserType, isParticipant, getMyCalendarLinks);
router.get('/calendar/export.ics', extractUserType, isParticipant, exportCalendarIcs);
router.get('/:eventId/forum', extractUserType, getForum);
router.post('/:eventId/forum', extractUserType, postMessage);
router.post('/:eventId/forum/:messageId/react', extractUserType, reactMessage);
router.patch('/:eventId/forum/:messageId/pin', extractUserType, isOrganizer, pinMessage);
router.delete('/:eventId/forum/:messageId', extractUserType, isOrganizer, deleteMessage);
router.get('/:eventId/forum/notifications', extractUserType, getNotifications);
router.get('/:eventId', extractUserType, isParticipant, getEventDiscovery);
router.post('/:eventId/register', extractUserType, isParticipant, handleRegistration);
router.post(
    '/merchandise/purchase', 
    extractUserType, 
    isParticipant, 
    upload.single('paymentProof'), // Intercepts the image, uploads to Cloudinary, attaches req.file.path
    buyMerch
);
router.put(
    '/merchandise/approve/:ticketId', 
    extractUserType, 
    isOrganizer, 
    approvePayment
);
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
router.get(
    '/attendance/stats/:eventId', 
    extractUserType, 
    isOrganizer, 
    getAttendanceStats
);
router.get('/attendance/dashboard/:eventId', extractUserType, isOrganizer, getAttendanceDashboard);
router.get('/attendance/export/:eventId', extractUserType, isOrganizer, exportAttendanceCsv);
router.put('/attendance/manual-override', extractUserType, isOrganizer, manualOverrideAttendance);
router.get('/attendance/audit/:eventId', extractUserType, isOrganizer, getAttendanceAudit);
module.exports = router;
