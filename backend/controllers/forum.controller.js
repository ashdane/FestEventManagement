const Event = require('../models/Events');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const ForumMessage = require('../models/ForumMessage');
const Ticket = require('../models/Ticket');
const canAccessEvent = async (eventId, user) => {
    const event = await Event.findById(eventId).select('org_id');
    if (!event) return { ok: false, status: 404, error: 'Event not found' };
    if (user.role === 'OGR') return String(event.org_id) === String(user.id) ? { ok: true, event } : { ok: false, status: 403, error: 'Unauthorized' };
    const participant = await Participant.findById(user.id).select('registrations.event_id first_name last_name');
    const isRegistered = (participant?.registrations || []).some((r) => String(r.event_id) === String(eventId));
    const merchTicket = await Ticket.findOne({
        participantId: user.id,
        eventId,
        type: 'Merchandise',
        status: { $nin: ['Rejected', 'Cancelled'] }
    }).select('_id');
    const hasAccess = isRegistered || !!merchTicket;
    return hasAccess ? { ok: true, event, participant } : { ok: false, status: 403, error: 'Register to access forum' };
};
const getForum = async (req, res) => {
    try {
        const { eventId } = req.params;
        const gate = await canAccessEvent(eventId, req.user);
        if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
        const since = req.query.since ? new Date(req.query.since) : null;
        const query = { eventId, deleted: false };
        if (since && !Number.isNaN(since.getTime())) query.updatedAt = { $gte: since };
        const messages = await ForumMessage.find(query).sort({ pinned: -1, createdAt: 1 });
        return res.status(200).json({ messages });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const postMessage = async (req, res) => {
    try {
        const { eventId } = req.params;
        const gate = await canAccessEvent(eventId, req.user);
        if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
        const { text, parentId, isAnnouncement } = req.body;
        if (!text || !String(text).trim()) return res.status(400).json({ error: 'text is required' });
        const authorName =
            req.user.role === 'OGR'
                ? (await Organizer.findById(req.user.id).select('org_name'))?.org_name || 'Organizer'
                : `${gate.participant?.first_name || ''} ${gate.participant?.last_name || ''}`.trim() || 'Participant';
        const message = await ForumMessage.create({
            eventId,
            authorId: req.user.id,
            authorRole: req.user.role,
            authorName,
            text: String(text).trim(),
            parentId: parentId || null,
            isAnnouncement: req.user.role === 'OGR' ? Boolean(isAnnouncement) : false
        });
        return res.status(201).json({ message: 'Posted', forumMessage: message });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const reactMessage = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const gate = await canAccessEvent(eventId, req.user);
        if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ error: 'emoji is required' });
        const msg = await ForumMessage.findOne({ _id: messageId, eventId, deleted: false });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        const idx = msg.reactions.findIndex((r) => r.emoji === emoji);
        if (idx === -1) msg.reactions.push({ emoji, users: [req.user.id] });
        else {
            const has = msg.reactions[idx].users.some((u) => String(u) === String(req.user.id));
            msg.reactions[idx].users = has
                ? msg.reactions[idx].users.filter((u) => String(u) !== String(req.user.id))
                : [...msg.reactions[idx].users, req.user.id];
            if (!msg.reactions[idx].users.length) msg.reactions.splice(idx, 1);
        }
        await msg.save();
        return res.status(200).json({ message: 'Reaction updated', reactions: msg.reactions });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const pinMessage = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const gate = await canAccessEvent(eventId, req.user);
        if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
        if (req.user.role !== 'OGR') return res.status(403).json({ error: 'Organizer only' });
        const msg = await ForumMessage.findOneAndUpdate({ _id: messageId, eventId, deleted: false }, { pinned: Boolean(req.body.pinned) }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        return res.status(200).json({ message: 'Pin updated', forumMessage: msg });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const deleteMessage = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const gate = await canAccessEvent(eventId, req.user);
        if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
        if (req.user.role !== 'OGR') return res.status(403).json({ error: 'Organizer only' });
        const msg = await ForumMessage.findOneAndUpdate({ _id: messageId, eventId, deleted: false }, { deleted: true }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        return res.status(200).json({ message: 'Message deleted' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getNotifications = async (req, res) => {
    try {
        const { eventId } = req.params;
        const gate = await canAccessEvent(eventId, req.user);
        if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
        const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 5 * 60 * 1000);
        const query = {
            eventId,
            deleted: false,
            createdAt: { $gt: since },
            authorId: { $ne: req.user.id }
        };
        const newCount = await ForumMessage.countDocuments(query);
        const latest = await ForumMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(5)
            .select('authorName text createdAt parentId');
        return res.status(200).json({ newCount, since: since.toISOString(), latest });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports = { getForum, postMessage, reactMessage, pinMessage, deleteMessage, getNotifications };
