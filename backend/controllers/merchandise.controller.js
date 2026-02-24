const Ticket = require('../models/Ticket');
const Events = require('../models/Events');
const { sendTicketMail } = require('../utils/mailer');

const buyMerch = async (req, res) => {
    try {
        const { eventId, size, color } = req.body;
        const qtyRequested = Number(req.body.qty || req.body.quantity || 1);
        const participantId = req.user.id; 
        let formResponses = {};
        try {
            formResponses = req.body.formResponses ? JSON.parse(req.body.formResponses) : {};
        } catch {
            formResponses = {};
        }

        const event = await Events.findById(eventId);

        // 1. Core Validation (Section 7.2)
        if (!event || event.event_type !== 'Merchandise') {
            return res.status(400).json({ error: 'Selected item is not a merchandise event.' });
        }

        // 2. Variant Validation (Section 8: Item details - size, color, variants)
        // Ensure the requested variant is actually offered by the organizer
        const hasSize = event.merchandiseDetails?.sizes?.includes(size);
        const hasColor = event.merchandiseDetails?.colors?.includes(color);
        
        if (!hasSize || !hasColor) {
            return res.status(400).json({ 
                error: 'Invalid variant selection.',
                availableSizes: event.merchandiseDetails?.sizes,
                availableColors: event.merchandiseDetails?.colors 
            });
        }

        // 3. Per-Participant Purchase Limit (Section 8: Configurable purchase limit)
        // Check if this participant has already bought/requested this item
        const existingOrders = await Ticket.find({ participantId, eventId, status: { $ne: 'Rejected' } });
        const currentUserTotal = existingOrders.reduce((acc, tkt) => acc + (tkt.merchandiseDetails?.qty || 0), 0);
        
        const purchaseLimit = event.merchandiseDetails?.purchaseLimitPerParticipant || 1;
        if (currentUserTotal + qtyRequested > purchaseLimit) {
            return res.status(400).json({ 
                error: `Purchase limit exceeded. You can only buy ${purchaseLimit} total. You already have ${currentUserTotal}.` 
            });
        }

        // 4. Global Stock Validation (Section 8: Stock quantity)
        const currentStock = Number(event.stockqty || 0);
        if (qtyRequested < 1 || currentStock < qtyRequested) {
            return res.status(400).json({ error: 'Insufficient stock available.' });
        }

        // 5. Payment Proof Requirement (Tier A, Feature 2)
        if (!req.file || !req.file.path) {
            return res.status(400).json({ error: 'Payment proof upload is mandatory for merchandise.' });
        }

        // 6. Create Order in Pending State
        const ticket = await Ticket.create({
            participantId,
            eventId,
            type: 'Merchandise',
            status: 'Pending Approval',
            merchandiseDetails: { 
                size, 
                color, 
                qty: qtyRequested, 
                paymentProofUrl: req.file.path 
            },
            formResponses
        });

        return res.status(201).json({ 
            message: 'Order placed successfully. Awaiting organizer approval.', 
            ticketId: ticket._id 
        });

    } catch (error) {
        console.error("BuyMerch Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
const approvePayment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId).populate('eventId participantId');
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.status !== 'Pending Approval')
            return res.status(400).json({ error: 'Ticket is not pending approval' });
        const ownerId = ticket.eventId.org_id || ticket.eventId.organizerId;
        if (!ownerId || String(ownerId) !== req.user.id)
            return res.status(403).json({ error: 'Unauthorized' });
        const event = await Events.findById(ticket.eventId._id);
        const currentStock = Number(event.stockqty ?? event.reg_limit ?? 0);
        const qty = Number(ticket.merchandiseDetails.qty || 0);
        if (currentStock < qty)
             return res.status(400).json({ error: 'Insufficient stock to approve this order.' });
        event.stockqty = currentStock - qty;
        await event.save();
        ticket.status = 'Successful';
        await ticket.save();
        try {
            await sendTicketMail(ticket.participantId.email, event.event_name || event.eventName || 'Event', ticket);
        } 
        catch (error) {
            res.status(500).json({ error: error.message });
        }
        res.status(200).json({ message: 'Payment approved. Ticket and QR sent', ticket });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const rejectPayment = async (req, res) => {
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

module.exports = { buyMerch, approvePayment, rejectPayment }
