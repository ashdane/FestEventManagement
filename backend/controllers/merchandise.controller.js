const Ticket = require('../models/Ticket');
const Events = require('../models/Events');
const { sendTicketEmail } = require('../utils/mailer');
exports.purchaseMerchandise = async (req, res) => {
    try {
        const { eventId, size, color } = req.body;
        const quantity = Number(req.body.quantity || 0);
        const participantId = req.user.id; 
        const event = await Events.findById(eventId);
        const eventType = event?.event_type || event?.eventType;
        const stockQuantity = Number(event?.stockQuantity ?? event?.reg_limit ?? 0);
        if (!event || eventType !== 'Merchandise') {
            return res.status(400).json({ error: 'Invalid merchandise event' });
        }
        if (quantity < 1 || stockQuantity < quantity) {
            return res.status(400).json({ error: 'Out of stock' });
        }
        if (!req.file || !req.file.path) {
            return res.status(400).json({ error: 'Payment proof is required' });
        }
        const ticket = await Ticket.create({
            participantId,
            eventId,
            type: 'Merchandise',
            status: 'Pending Approval',
            merchandiseDetails: {
                size,
                color,
                quantity,
                paymentProofUrl: req.file.path // URL from Cloudinary
            }
        });
        res.status(201).json({ message: 'Order placed. Pending organizer approval.', ticket });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.approvePayment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId).populate('eventId participantId');
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.status !== 'Pending Approval') {
            return res.status(400).json({ error: 'Ticket is not pending approval' });
        }
        const ownerId = ticket.eventId.org_id || ticket.eventId.organizerId;
        if (!ownerId || String(ownerId) !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const event = await Events.findById(ticket.eventId._id);
        const currentStock = Number(event.stockQuantity ?? event.reg_limit ?? 0);
        const qty = Number(ticket.merchandiseDetails.quantity || 0);
        if (currentStock < qty) {
             return res.status(400).json({ error: 'Insufficient stock to approve this order.' });
        }
        event.stockQuantity = currentStock - qty;
        await event.save();
        ticket.status = 'Successful';
        await ticket.save();
        try {
            await sendTicketEmail(ticket.participantId.email, event.event_name || event.eventName || 'Event', ticket);
        } catch (_) {}
        res.status(200).json({ message: 'Payment approved. Ticket and QR code sent to participant.', ticket });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.rejectPayment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId).populate('eventId');
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        const ownerId = ticket.eventId.org_id || ticket.eventId.organizerId;
        if (!ownerId || String(ownerId) !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        ticket.status = 'Rejected';
        await ticket.save();
        res.status(200).json({ message: 'Payment rejected.', ticket });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
