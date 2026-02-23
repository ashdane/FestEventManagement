const express = require('express');
const {
    getMyProfile,
    updateMyProfile,
    updateInterests,
    changeMyPassword,
    getOrganizersList,
    getOrganizerDetails,
    followOrganizer,
    unfollowOrganizer
} = require('../controllers/participant.controller');
const { extractUserType, isParticipant } = require('../middleware/auth.middleware');
const router = express.Router();
router.get('/me', extractUserType, isParticipant, getMyProfile);
router.patch('/me', extractUserType, isParticipant, updateMyProfile);
router.patch('/me/password', extractUserType, isParticipant, changeMyPassword);
router.patch('/update-interests', extractUserType, isParticipant, updateInterests);
router.get('/organizers', extractUserType, isParticipant, getOrganizersList);
router.get('/organizers/:organizerId', extractUserType, isParticipant, getOrganizerDetails);
router.patch('/organizers/:organizerId/follow', extractUserType, isParticipant, followOrganizer);
router.patch('/organizers/:organizerId/unfollow', extractUserType, isParticipant, unfollowOrganizer);
module.exports = router;
