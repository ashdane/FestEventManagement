const Ticket = require('../models/Ticket');
const Events = require('../models/Events');
exports.scanTicket = async (req, res) => {
    try {
        const { ticketId } = req.body; // The string decoded from the QR code
        const ticket = await Ticket.findOne({ ticketId }).populate('eventId participantId');
        if (!ticket) {
            return res.status(404).json({ error: 'Invalid Ticket: Not found in system' });
        }
        const ownerId = ticket.eventId.org_id || ticket.eventId.organizerId;
        if (!ownerId || String(ownerId) !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this event' });
        }
        if (ticket.status !== 'Successful') {
            return res.status(400).json({ 
                error: `Cannot check-in. Ticket status is: ${ticket.status}` 
            });
        }
        const attendance = ticket.attendance || { scanned: false, scannedAt: null };
        if (attendance.scanned) {
            return res.status(409).json({ 
                error: 'Duplicate Scan', 
                scannedAt: attendance.scannedAt 
            });
        }
        if (!ticket.attendance) ticket.attendance = {};
        ticket.attendance.scanned = true;
        ticket.attendance.scannedAt = new Date();
        await ticket.save();
        res.status(200).json({
            message: 'Check-in Successful',
            participantName: `${ticket.participantId.first_name || ticket.participantId.firstName || ''} ${ticket.participantId.last_name || ticket.participantId.lastName || ''}`.trim(),
            eventName: ticket.eventId.event_name || ticket.eventId.eventName || 'Event',
            timestamp: ticket.attendance.scannedAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAttendanceStats = async (req, res) => {
    try {
        const { eventId } = req.params;
        const totalTickets = await Ticket.countDocuments({ eventId, status: 'Successful' });
        const scannedTickets = await Ticket.countDocuments({ eventId, 'attendance.scanned': true });
        res.status(200).json({
            totalRegistered: totalTickets,
            checkedIn: scannedTickets,
            remaining: totalTickets - scannedTickets,
            attendancePercentage: totalTickets > 0 ? (scannedTickets / totalTickets * 100).toFixed(2) : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
