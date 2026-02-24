const Organizer = require('../models/Organizer');
const Event = require('../models/Events');
const Ticket = require('../models/Ticket');
const Participant = require('../models/Participant');
const ResetRequest = require('../models/ResetRequest');
const ForumMessage = require('../models/ForumMessage');
const AttendanceAudit = require('../models/AttendanceAudit');
const crypto = require('crypto');
const slug = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) || 'org';
const genPassword = () => crypto.randomBytes(6).toString('base64url').slice(0, 10);
const genEmail = (orgName) => `${slug(orgName)}.${Date.now().toString().slice(-6)}@fems.local`;
const createOrg = async (req, res) => {
    try {
        const { org_name, description, category, contact_email, phone_number } = req.body;
        if (!org_name) return res.status(400).json({ error: 'org_name is required' });
        let email = genEmail(org_name);
        while (await Organizer.exists({ email })) email = genEmail(`${org_name}${Math.floor(Math.random() * 1000)}`);
        const password = genPassword();
        const organizer = await Organizer.create({
            role: 'OGR',
            org_name,
            email,
            password,
            description: description || '',
            category: category || '',
            contact_email: contact_email || email,
            phone_number: phone_number || '',
            enabled: true,
            archived: false
        });
        const out = organizer.toObject();
        delete out.password;
        return res.status(201).json({
            message: 'Organizer created successfully with auto-generated credentials',
            organizer: out,
            credentials: { email, password }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getOrgs = async (_req, res) => {
    try {
        const organizers = await Organizer.find().select('org_name email category description enabled archived createdAt');
        return res.status(200).json(organizers);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const setEnabled = async (req, res, enabled) => {
    const { organizerId } = req.params;
    const organizer = await Organizer.findByIdAndUpdate(organizerId, { enabled }, { new: true }).select('org_name email enabled archived');
    if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
    return res.status(200).json({ message: enabled ? 'Organizer enabled' : 'Organizer disabled', organizer });
};
const disableOrg = async (req, res) => {
    try { return await setEnabled(req, res, false); } catch (error) { return res.status(500).json({ error: error.message }); }
};
const enableOrg = async (req, res) => {
    try { return await setEnabled(req, res, true); } catch (error) { return res.status(500).json({ error: error.message }); }
};
const archiveOrg = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const organizer = await Organizer.findByIdAndUpdate(organizerId, { archived: true, enabled: false }, { new: true }).select('org_name email enabled archived');
        if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
        return res.status(200).json({ message: 'Organizer archived', organizer });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const removeOrg = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const organizer = await Organizer.findById(organizerId).select('_id');
        if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
        const eventIds = (await Event.find({ org_id: organizerId }).select('_id')).map((e) => e._id);
        await Promise.all([
            Event.deleteMany({ org_id: organizerId }),
            Ticket.deleteMany({ eventId: { $in: eventIds } }),
            ForumMessage.deleteMany({ eventId: { $in: eventIds } }),
            AttendanceAudit.deleteMany({ eventId: { $in: eventIds } }),
            ResetRequest.deleteMany({ organizerId }),
            Participant.updateMany(
                {},
                {
                    $pull: {
                        orgs_of_interests: organizerId,
                        registrations: { event_id: { $in: eventIds } }
                    }
                }
            ),
            Organizer.deleteOne({ _id: organizerId })
        ]);
        return res.status(200).json({ message: 'Organizer deleted permanently with associated data cleanup' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports = { createOrg, getOrgs, disableOrg, enableOrg, archiveOrg, removeOrg };
