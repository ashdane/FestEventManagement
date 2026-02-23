const Ticket = require('../models/Ticket');
const Events = require('../models/Events');
const { sendTicketEmail } = require('../utils/mailer');

// POST /api/merchandise/purchase
exports.purchaseMerchandise = async (req, res) => {
    try {
        const { eventId, size, color } = req.body;
        const quantity = Number(req.body.quantity || 0);
        const participantId = req.user.id; 
        
        // 1. Validate Event & Stock
        const event = await Events.findById(eventId);
        const eventType = event?.event_type || event?.eventType;
        const stockQuantity = Number(event?.stockQuantity ?? event?.reg_limit ?? 0);
        if (!event || eventType !== 'Merchandise') {
            return res.status(400).json({ error: 'Invalid merchandise event' });
        }
        if (quantity < 1 || stockQuantity < quantity) {
            return res.status(400).json({ error: 'Out of stock' });
        }

        // 2. Require payment proof from Multer/Cloudinary middleware
        if (!req.file || !req.file.path) {
            return res.status(400).json({ error: 'Payment proof is required' });
        }

        // 3. Create Ticket in Pending State
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

// PUT /api/merchandise/approve/:ticketId
// Organizers only
exports.approvePayment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        const ticket = await Ticket.findById(ticketId).populate('eventId participantId');
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.status !== 'Pending Approval') {
            return res.status(400).json({ error: 'Ticket is not pending approval' });
        }

        // 1. Verify Organizer owns this event (Security)
        const ownerId = ticket.eventId.org_id || ticket.eventId.organizerId;
        if (!ownerId || String(ownerId) !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 2. Decrement stock
        const event = await Events.findById(ticket.eventId._id);
        const currentStock = Number(event.stockQuantity ?? event.reg_limit ?? 0);
        const qty = Number(ticket.merchandiseDetails.quantity || 0);
        if (currentStock < qty) {
             return res.status(400).json({ error: 'Insufficient stock to approve this order.' });
        }
        event.stockQuantity = currentStock - qty;
        await event.save();

        // 3. Update status & Email QR
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

// PUT /api/merchandise/reject/:ticketId
// Organizers only
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

        // Optional: Send rejection email here

        res.status(200).json({ message: 'Payment rejected.', ticket });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
