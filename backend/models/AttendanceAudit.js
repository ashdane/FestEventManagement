const mongoose = require('mongoose');
const AttendanceAuditSchema = new mongoose.Schema(
    {
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Events', required: true, index: true },
        ticketId: { type: String, required: true },
        action: { type: String, enum: ['SCAN_CHECKIN', 'MANUAL_CHECKIN', 'MANUAL_CHECKOUT'], required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, default: '' },
        previousState: {
            scanned: { type: Boolean, default: false },
            scannedAt: { type: Date, default: null }
        },
        nextState: {
            scanned: { type: Boolean, default: false },
            scannedAt: { type: Date, default: null }
        }
    },
    { timestamps: true }
);
module.exports = mongoose.model('AttendanceAudit', AttendanceAuditSchema);
