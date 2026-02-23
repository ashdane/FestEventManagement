const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Event = require('../models/Events');
const editableFields = [
    'first_name',
    'last_name',
    'phone_number',
    'org_name',
    'areas_of_interests',
    'orgs_of_interests'
];
const restrictedFields = ['email', 'participant_type', 'password'];
const getMyProfile = async (req, res) => {
    try {
        const participant = await Participant.findById(req.user.id)
            .select(
                'first_name last_name email participant_type org_name phone_number areas_of_interests orgs_of_interests'
            )
            .populate('orgs_of_interests', 'org_name');
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        return res.status(200).json(participant);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const updateMyProfile = async (req, res) => {
    try {
        if (restrictedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field))) {
            return res.status(400).json({ error: 'Sensitive fields cannot be updated here' });
        }
        const updatePayload = {};
        editableFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updatePayload[field] = req.body[field];
            }
        });
        const participant = await Participant.findByIdAndUpdate(
            req.user.id,
            { $set: updatePayload },
            { new: true, runValidators: true }
        )
            .select('-password')
            .populate('orgs_of_interests', 'org_name');
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        return res.status(200).json({ message: 'Profile updated', participant });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const updateInterests = async (req, res) => {
    try {
        const { areas_of_interests = [], orgs_of_interests = [] } = req.body;
        if (!Array.isArray(areas_of_interests) || !Array.isArray(orgs_of_interests)) {
            return res
                .status(400)
                .json({ error: 'areas_of_interests and orgs_of_interests must both be arrays' });
        }
        const participant = await Participant.findByIdAndUpdate(
            req.user.id,
            { $set: { areas_of_interests, orgs_of_interests } },
            { new: true, runValidators: true }
        ).select('areas_of_interests orgs_of_interests');
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        return res.status(200).json({
            message: 'Interests updated',
            areas_of_interests: participant.areas_of_interests,
            orgs_of_interests: participant.orgs_of_interests
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const changeMyPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'All password fields are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New password and confirm password do not match' });
        }
        const participant = await Participant.findById(req.user.id);
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        const isOldPasswordValid = await participant.ValidatePassword(oldPassword);
        if (!isOldPasswordValid) {
            return res.status(401).json({ error: 'Old password is incorrect' });
        }
        participant.password = newPassword;
        await participant.save();
        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const getOrganizersList = async (req, res) => {
    try {
        const participant = await Participant.findById(req.user.id).select('orgs_of_interests');
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        const followedSet = new Set((participant.orgs_of_interests || []).map((id) => String(id)));
        const organizers = await Organizer.find({ __t: 'Organizer' }).select(
            'org_name category description'
        );
        return res.status(200).json(
            organizers.map((org) => ({
                ...org.toObject(),
                isFollowed: followedSet.has(String(org._id))
            }))
        );
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getOrganizerDetails = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const [participant, organizer] = await Promise.all([
            Participant.findById(req.user.id).select('orgs_of_interests'),
            Organizer.findById(organizerId).select('org_name category description email')
        ]);
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
        const now = new Date();
        const events = await Event.find({
            org_id: String(organizerId),
            status: { $in: ['PUBLISHED', 'ONGOING', 'COMPLETED', 'CLOSED'] }
        }).select('event_name event_start event_end event_type status');
        const followedSet = new Set((participant.orgs_of_interests || []).map((id) => String(id)));
        const upcomingEvents = events.filter((event) => new Date(event.event_start) >= now);
        const pastEvents = events.filter((event) => new Date(event.event_start) < now);
        return res.status(200).json({
            organizer: {
                ...organizer.toObject(),
                isFollowed: followedSet.has(String(organizerId))
            },
            upcomingEvents,
            pastEvents
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const setFollowState = async (req, res, shouldFollow) => {
    const { organizerId } = req.params;
    const participantId = req.user.id;
    const [participant, organizer] = await Promise.all([
        Participant.findById(participantId).select('orgs_of_interests'),
        Organizer.findById(organizerId).select('_id')
    ]);
    if (!participant) return res.status(404).json({ error: 'Participant not found' });
    if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
    const update = shouldFollow
        ? { $addToSet: { orgs_of_interests: organizerId } }
        : { $pull: { orgs_of_interests: organizerId } };
    await Participant.findByIdAndUpdate(participantId, update);
    return res.status(200).json({
        message: shouldFollow ? 'Followed organizer' : 'Unfollowed organizer',
        following: shouldFollow
    });
};
const followOrganizer = async (req, res) => {
    try {
        return await setFollowState(req, res, true);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const unfollowOrganizer = async (req, res) => {
    try {
        return await setFollowState(req, res, false);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports = {
    getMyProfile,
    updateMyProfile,
    updateInterests,
    changeMyPassword,
    getOrganizersList,
    getOrganizerDetails,
    followOrganizer,
    unfollowOrganizer
};
