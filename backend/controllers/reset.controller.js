const ResetRequest = require('../models/ResetRequest');
const Organizer = require('../models/Organizer');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// 1. Organizer requests a reset
exports.requestReset = async (req, res) => {
    try {
        const { reason } = req.body;
        const organizerId = req.user.id;

        const request = await ResetRequest.create({
            organizerId,
            reason
        });

        res.status(201).json({ message: 'Reset request submitted to Admin', request });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Admin views all requests
exports.getAllRequests = async (req, res) => {
    try {
        const requests = await ResetRequest.find().populate('organizerId');
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Admin approves request
exports.approveReset = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { comments } = req.body;

        const request = await ResetRequest.findById(requestId).populate('organizerId');
        if (!request) return res.status(404).json({ error: 'Request not found' });

        // Generate a temporary random password
        const tempPassword = crypto.randomBytes(4).toString('hex'); // e.g., "a1b2c3d4"
        const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

        // Update the User record (where the actual login auth lives)
        await User.findOneAndUpdate(
            { email: request.organizerId.contactEmail },
            { password: hashedTempPassword }
        );

        request.status = 'Approved';
        request.generatedPassword = tempPassword;
        request.adminComments = comments;
        await request.save();

        res.status(200).json({ 
            message: 'Password reset approved', 
            newPassword: tempPassword // Admin sees this to share with Organizer
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};