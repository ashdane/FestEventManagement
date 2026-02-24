const mongoose = require('mongoose');
const ticketSchema = new mongoose.Schema({
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Events',
        required: true
    },
    type: {
        type: String,
        enum: ['Normal', 'Merchandise'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending Approval', 'Successful', 'Rejected', 'Cancelled'],
        default: 'Successful' // Normal events default to Successful, Merch defaults to Pending
    },
    ticketId: {
        type: String,
        unique: true,
        required: true,
        default: () => 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    },
    merchandiseDetails: {
        size: String,
        color: String,
        qty: Number,
        paymentProofUrl: String // Cloudinary URL
    },
    formResponses: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    attendance: {
        scanned: { type: Boolean, default: false },
        scannedAt: { type: Date }
    }
}, { timestamps: true });
module.exports = mongoose.model('Ticket', ticketSchema);
