const ResetRequest = require('../models/ResetRequest');
const Organizer = require('../models/Organizer');
const crypto = require('crypto');
exports.requestReset = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason || !reason.trim()) return res.status(400).json({ error: 'Reason is required' });
        const organizerId = req.user.id;
        const pending = await ResetRequest.findOne({ organizerId, status: 'Pending' });
        if (pending) return res.status(400).json({ error: 'A pending reset request already exists' });
        const request = await ResetRequest.create({ organizerId, reason: reason.trim() });
        return res.status(201).json({ message: 'Reset request submitted', request });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getAllRequests = async (_req, res) => {
    try {
        const requests = await ResetRequest.find().populate('organizerId', 'org_name email').sort({ createdAt: -1 });
        return res.status(200).json(requests);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.approveReset = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { comments } = req.body;
        const request = await ResetRequest.findById(requestId).populate('organizerId');
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'Pending') return res.status(400).json({ error: `Request already ${request.status}` });
        const organizer = await Organizer.findById(request.organizerId._id);
        if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
        const tempPassword = crypto.randomBytes(4).toString('hex');
        organizer.password = tempPassword;
        await organizer.save();
        request.status = 'Approved';
        request.generatedPassword = tempPassword;
        request.adminComments = comments || '';
        await request.save();
        return res.status(200).json({ message: 'Password reset approved', newPassword: tempPassword, request });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.rejectReset = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { comments } = req.body;
        const request = await ResetRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'Pending') return res.status(400).json({ error: `Request already ${request.status}` });
        request.status = 'Rejected';
        request.adminComments = comments || '';
        await request.save();
        return res.status(200).json({ message: 'Reset rejected successfully', request });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getPrevResets = async (_req, res) => {
    try {
        const history = await ResetRequest.find({ status: { $in: ['Approved', 'Rejected'] } })
            .populate('organizerId', 'org_name email')
            .sort({ updatedAt: -1 });
        return res.status(200).json(history);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyRequests = async (req, res) => {
    try {
        const requests = await ResetRequest.find({ organizerId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json(requests);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
