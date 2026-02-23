const Ticket = require('../models/Ticket');
const Events = require('../models/Events');
const AttendanceAudit = require('../models/AttendanceAudit');
const ownEvent = async (eventId, userId) => {
    const event = await Events.findById(eventId).select('org_id organizerId event_name');
    if (!event) return { error: 'Event not found', status: 404 };
    const ownerId = event.org_id || event.organizerId;
    if (!ownerId || String(ownerId) !== String(userId)) return { error: 'Unauthorized: You do not own this event', status: 403 };
    return { event };
};
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
        const previousState = { scanned: Boolean(ticket.attendance.scanned), scannedAt: ticket.attendance.scannedAt || null };
        ticket.attendance.scanned = true;
        ticket.attendance.scannedAt = new Date();
        await ticket.save();
        await AttendanceAudit.create({
            eventId: ticket.eventId._id,
            ticketId: ticket.ticketId,
            action: 'SCAN_CHECKIN',
            performedBy: req.user.id,
            previousState,
            nextState: { scanned: true, scannedAt: ticket.attendance.scannedAt }
        });
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
        const gate = await ownEvent(eventId, req.user.id);
        if (gate.error) return res.status(gate.status).json({ error: gate.error });
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
exports.getAttendanceDashboard = async (req, res) => {
    try {
        const { eventId } = req.params;
        const gate = await ownEvent(eventId, req.user.id);
        if (gate.error) return res.status(gate.status).json({ error: gate.error });
        const tickets = await Ticket.find({ eventId, status: 'Successful' }).populate('participantId', 'first_name last_name email');
        const rows = tickets.map((ticket) => ({
            ticketId: ticket.ticketId,
            participantName: `${ticket.participantId?.first_name || ''} ${ticket.participantId?.last_name || ''}`.trim(),
            participantEmail: ticket.participantId?.email || '',
            scanned: Boolean(ticket.attendance?.scanned),
            scannedAt: ticket.attendance?.scannedAt || null
        }));
        const scanned = rows.filter((r) => r.scanned);
        const pending = rows.filter((r) => !r.scanned);
        return res.status(200).json({
            event: { id: eventId, name: gate.event.event_name || 'Event' },
            stats: {
                totalRegistered: rows.length,
                checkedIn: scanned.length,
                remaining: pending.length,
                attendancePercentage: rows.length ? Number(((scanned.length / rows.length) * 100).toFixed(2)) : 0
            },
            scanned,
            pending
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.exportAttendanceCsv = async (req, res) => {
    try {
        const { eventId } = req.params;
        const gate = await ownEvent(eventId, req.user.id);
        if (gate.error) return res.status(gate.status).json({ error: gate.error });
        const tickets = await Ticket.find({ eventId, status: 'Successful' }).populate('participantId', 'first_name last_name email');
        const rows = ['Ticket ID,Participant Name,Participant Email,Checked In,Scanned At'];
        tickets.forEach((t) => rows.push(`"${t.ticketId}","${`${t.participantId?.first_name || ''} ${t.participantId?.last_name || ''}`.trim()}","${t.participantId?.email || ''}","${t.attendance?.scanned ? 'Yes' : 'No'}","${t.attendance?.scannedAt ? new Date(t.attendance.scannedAt).toISOString() : ''}"`));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${eventId}.csv"`);
        return res.status(200).send(rows.join('\n'));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.manualOverrideAttendance = async (req, res) => {
    try {
        const { ticketId, action, reason } = req.body;
        if (!ticketId || !action) return res.status(400).json({ error: 'ticketId and action are required' });
        if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) return res.status(400).json({ error: 'action must be CHECK_IN or CHECK_OUT' });
        const ticket = await Ticket.findOne({ ticketId }).populate('eventId participantId');
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        const ownerId = ticket.eventId.org_id || ticket.eventId.organizerId;
        if (!ownerId || String(ownerId) !== String(req.user.id)) return res.status(403).json({ error: 'Unauthorized: You do not own this event' });
        if (ticket.status !== 'Successful') return res.status(400).json({ error: `Cannot modify attendance for ticket status: ${ticket.status}` });
        if (!ticket.attendance) ticket.attendance = {};
        const previousState = { scanned: Boolean(ticket.attendance.scanned), scannedAt: ticket.attendance.scannedAt || null };
        if (action === 'CHECK_IN') {
            ticket.attendance.scanned = true;
            ticket.attendance.scannedAt = ticket.attendance.scannedAt || new Date();
        } else {
            ticket.attendance.scanned = false;
            ticket.attendance.scannedAt = null;
        }
        await ticket.save();
        await AttendanceAudit.create({
            eventId: ticket.eventId._id,
            ticketId: ticket.ticketId,
            action: action === 'CHECK_IN' ? 'MANUAL_CHECKIN' : 'MANUAL_CHECKOUT',
            performedBy: req.user.id,
            reason: reason || '',
            previousState,
            nextState: { scanned: Boolean(ticket.attendance.scanned), scannedAt: ticket.attendance.scannedAt || null }
        });
        return res.status(200).json({
            message: action === 'CHECK_IN' ? 'Participant manually checked in' : 'Participant manually checked out',
            ticketId: ticket.ticketId,
            attendance: ticket.attendance
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getAttendanceAudit = async (req, res) => {
    try {
        const { eventId } = req.params;
        const gate = await ownEvent(eventId, req.user.id);
        if (gate.error) return res.status(gate.status).json({ error: gate.error });
        const logs = await AttendanceAudit.find({ eventId }).sort({ createdAt: -1 }).limit(200);
        return res.status(200).json({ logs });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
