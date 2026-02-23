const mongoose = require('mongoose');

const resetRequestSchema = new mongoose.Schema({
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    adminComments: String,
    generatedPassword: String // Only populated after approval
}, { timestamps: true });

module.exports = mongoose.model('ResetRequest', resetRequestSchema);