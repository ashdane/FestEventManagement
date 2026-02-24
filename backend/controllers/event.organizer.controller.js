const { Event, formFields, formStatus, formatOrgEvent, getEventStats } = require('./event.shared');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Ticket = require('../models/Ticket');
const buildParticipants = async (eventId, regFee, q, status) => {
    const docs = await Participant.aggregate([
        { $unwind: '$registrations' },
        { $match: { 'registrations.event_id': eventId } },
        { $project: { first_name: 1, last_name: 1, email: 1, registered_at: '$registrations.registered_at', participation_status: '$registrations.participation_status', team_name: '$registrations.team_name', ticket_id: '$registrations.ticket_id' } }
    ]);
    const rx = q ? new RegExp(q, 'i') : null;
    return docs
        .filter((p) => (!status || p.participation_status === status) && (!rx || rx.test(`${p.first_name || ''} ${p.last_name || ''}`) || rx.test(p.email || '') || rx.test(p.team_name || '')))
        .map((p) => ({ name: `${p.first_name || ''} ${p.last_name || ''}`.trim(), email: p.email || '', regDate: p.registered_at || null, payment: regFee || 0, team: p.team_name || 'N/A', attendance: p.participation_status === 'COMPLETED', status: p.participation_status, ticket_id: p.ticket_id }));
};
const maybePostDiscord = async (organizerId, event) => {
    try {
        const organizer = await Organizer.findById(organizerId).select('discord_webhook_url org_name');
        if (!organizer?.discord_webhook_url) return;
        await fetch(organizer.discord_webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: `New event published by ${organizer.org_name}: ${event.event_name} (${new Date(event.event_start).toLocaleString()})` }) });
    } catch (_) {}
};
const buildMerchOrders = async (eventId, q, status) => {
    const rx = q ? new RegExp(q, 'i') : null;
    const orders = await Ticket.find({ eventId, type: 'Merchandise' })
        .populate('participantId', 'first_name last_name email')
        .sort({ createdAt: -1 })
        .lean();
    return orders
        .filter((t) => (!status || t.status === status) && (!rx || rx.test(t.ticketId || '') || rx.test(t.participantId?.email || '') || rx.test(`${t.participantId?.first_name || ''} ${t.participantId?.last_name || ''}`)))
        .map((t) => ({
            _id: t._id,
            ticketId: t.ticketId,
            status: t.status,
            participantName: `${t.participantId?.first_name || ''} ${t.participantId?.last_name || ''}`.trim(),
            participantEmail: t.participantId?.email || '',
            size: t.merchandiseDetails?.size || '',
            color: t.merchandiseDetails?.color || '',
            qty: Number(t.merchandiseDetails?.qty || 0),
            paymentProofUrl: t.merchandiseDetails?.paymentProofUrl || '',
            createdAt: t.createdAt,
            attendance: !!t.attendance?.scanned
        }));
};
const createEventDraft = async (req, res) => {
    try {
        const payload = { ...req.body, status: 'DRAFT', org_id: req.user.id };
        const event = new Event(payload);
        await event.save();
        return res.status(201).json({ message: 'Draft event created successfully', event: formatOrgEvent(event) });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const getOrganizerEvents = async (req, res) => {
    try {
        const events = await Event.find({ org_id: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({ events: events.map((event) => formatOrgEvent(event)) });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getOrganizerEventDetails = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { q, status, format } = req.query;
        const event = await Event.findOne({ _id: eventId, org_id: req.user.id });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        const stats = await getEventStats(event._id);
        const merchOrders = event.event_type === 'Merchandise' ? await buildMerchOrders(event._id, q, status) : [];
        const participants = event.event_type === 'Merchandise'
            ? merchOrders.map((o) => ({
                name: o.participantName,
                email: o.participantEmail,
                regDate: o.createdAt,
                payment: Number(o.qty || 0) * Number(event.reg_fee || 0),
                team: 'N/A',
                attendance: o.attendance,
                status: o.status,
                ticket_id: o.ticketId
            }))
            : await buildParticipants(event._id, event.reg_fee, q, status);
        const successfulOrders = merchOrders.filter((o) => o.status === 'Successful');
        const merchRevenue = successfulOrders.reduce((sum, o) => sum + Number(o.qty || 0) * Number(event.reg_fee || 0), 0);
        const detailAnalytics = {
            registrations: participants.length,
            sales: event.event_type === 'Merchandise' ? successfulOrders.length : participants.filter((p) => ['REGISTERED', 'COMPLETED'].includes(p.status)).length,
            attendance: event.event_type === 'Merchandise' ? successfulOrders.filter((o) => o.attendance).length : participants.filter((p) => p.attendance).length,
            teamCompletion: participants.filter((p) => p.team && p.team !== 'N/A').length,
            revenue: event.event_type === 'Merchandise' ? merchRevenue : participants.length * (event.reg_fee || 0)
        };
        if (format === 'csv') {
            const header = event.event_type === 'Merchandise'
                ? 'Ticket ID,Name,Email,Reg Date,Size,Color,Qty,Status,Payment Proof'
                : 'Name,Email,Reg Date,Payment,Team,Attendance,Status,Ticket ID';
            const body = event.event_type === 'Merchandise'
                ? merchOrders.map((o) => `"${o.ticketId || ''}","${o.participantName || ''}","${o.participantEmail || ''}","${o.createdAt ? new Date(o.createdAt).toISOString() : ''}","${o.size || ''}","${o.color || ''}","${o.qty || 0}","${o.status || ''}","${o.paymentProofUrl || ''}"`)
                : participants.map((p) => `"${p.name}","${p.email}","${p.regDate ? new Date(p.regDate).toISOString() : ''}","${p.payment}","${p.team}","${p.attendance ? 'Yes' : 'No'}","${p.status}","${p.ticket_id || ''}"`);
            const rows = [header].concat(body);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-participants.csv"`);
            return res.status(200).send(rows.join('\n'));
        }
        return res.status(200).json({ event: formatOrgEvent(event), registrationsCount: stats.registrationsCount, attendanceCount: stats.attendanceCount, participants, detailAnalytics, merchOrders });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getOrganizerDashboardSummary = async (req, res) => {
    try {
        const events = await Event.find({ org_id: req.user.id }).select('event_name reg_fee status event_start event_end');
        const statsByEvent = await Promise.all(events.map(async (event) => {
            const formatted = formatOrgEvent(event);
            if (formatted.event_type === 'Merchandise') {
                const merch = await Ticket.find({ eventId: event._id, type: 'Merchandise', status: 'Successful' }).select('merchandiseDetails.qty attendance.scanned');
                const regCount = merch.length;
                const qtySold = merch.reduce((sum, t) => sum + Number(t.merchandiseDetails?.qty || 0), 0);
                const attendance = merch.filter((t) => t.attendance?.scanned).length;
                return { ...formatted, regCount, qtySold, attendance };
            }
            const stats = await getEventStats(event._id);
            return { ...formatted, regCount: stats.registrationsCount, qtySold: stats.registrationsCount, attendance: stats.attendanceCount };
        }));
        const analytics = statsByEvent.reduce((acc, event) => {
            acc.totalRegistrations += event.regCount;
            acc.totalAttendance += event.attendance;
            acc.totalRevenue += Number(event.qtySold || event.regCount || 0) * (event.reg_fee || 0);
            if (['COMPLETED', 'CLOSED'].includes(event.status)) acc.completed_events += 1;
            return acc;
        }, { totalRegistrations: 0, totalRevenue: 0, totalAttendance: 0, completed_events: 0 });
        analytics.total_sales = statsByEvent.reduce((sum, e) => sum + Number(e.qtySold || e.regCount || 0), 0);
        analytics.total_registrations = analytics.totalRegistrations;
        analytics.total_revenue = analytics.totalRevenue;
        analytics.total_attendance = analytics.totalAttendance;
        return res.status(200).json({ events: statsByEvent, analytics });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const publishEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findOne({ _id: eventId, org_id: req.user.id });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft events can be published' });
        const requiredFields = ['event_name', 'event_type', 'eligibility', 'reg_deadline', 'event_start', 'event_end', 'reg_limit', 'reg_fee'];
        for (const field of requiredFields) if (event[field] === undefined || event[field] === null || event[field] === '') return res.status(400).json({ error: `Missing required field: ${field}` });
        if (event.event_type === 'Normal' && (!event.event_registration_form || event.event_registration_form.length === 0)) return res.status(400).json({ error: 'Define registration form fields before publishing a normal event' });
        if (event.event_type === 'Merchandise') {
            if (!Array.isArray(event.merchandiseDetails?.sizes) || !event.merchandiseDetails.sizes.length) return res.status(400).json({ error: 'Merchandise sizes are required' });
            if (!Array.isArray(event.merchandiseDetails?.colors) || !event.merchandiseDetails.colors.length) return res.status(400).json({ error: 'Merchandise colors are required' });
            if (Number(event.stockqty || 0) < 1) return res.status(400).json({ error: 'Stock quantity must be at least 1' });
        }
        event.status = 'PUBLISHED';
        await event.save();
        await maybePostDiscord(req.user.id, event);
        return res.status(200).json({ message: 'Event published successfully', event: formatOrgEvent(event) });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const updateEventByOrganizer = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findOne({ _id: eventId, org_id: req.user.id });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        const effectiveStatus = formStatus(event);
        const updates = { ...req.body };
        delete updates.org_id;
        delete updates.event_registration_form;
        delete updates.form_locked;
        if (effectiveStatus === 'DRAFT') {
            formFields.forEach((field) => { if (Object.prototype.hasOwnProperty.call(updates, field)) event[field] = updates[field]; });
        } else if (effectiveStatus === 'PUBLISHED') {
            if (Object.prototype.hasOwnProperty.call(updates, 'event_description')) event.event_description = updates.event_description;
            if (Object.prototype.hasOwnProperty.call(updates, 'reg_deadline')) {
                const newDeadline = new Date(updates.reg_deadline);
                if (newDeadline <= new Date(event.reg_deadline)) return res.status(400).json({ error: 'Can only extend registration deadline for published events' });
                event.reg_deadline = newDeadline;
            }
            if (Object.prototype.hasOwnProperty.call(updates, 'reg_limit')) {
                const newLimit = Number(updates.reg_limit);
                if (newLimit < Number(event.reg_limit)) return res.status(400).json({ error: 'Can only increase registration limit for published events' });
                event.reg_limit = newLimit;
            }
            if (Object.prototype.hasOwnProperty.call(updates, 'registration_closed')) {
                if (updates.registration_closed !== true) return res.status(400).json({ error: 'Published events can only be closed for registrations' });
                event.registration_closed = true;
            }
        } else if (['ONGOING', 'COMPLETED'].includes(effectiveStatus)) {
            if (!Object.prototype.hasOwnProperty.call(updates, 'status')) return res.status(400).json({ error: 'Only status change is allowed for ongoing/completed events' });
            const nextStatus = updates.status;
            if (!['COMPLETED', 'CLOSED'].includes(nextStatus)) return res.status(400).json({ error: 'Allowed status transitions: COMPLETED or CLOSED' });
            event.status = nextStatus;
        } else {
            return res.status(400).json({ error: 'Closed events are not editable' });
        }
        await event.save();
        return res.status(200).json({ message: 'Event updated successfully', event: formatOrgEvent(event) });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const manageOrganizerEvents = async (req, res) => {
    if (req.params.eventId) return getOrganizerEventDetails(req, res);
    if (req.path.includes('/dashboard-summary') || req.query.view === 'dashboard') return getOrganizerDashboardSummary(req, res);
    return getOrganizerEvents(req, res);
};
const manageEventLifecycle = async (req, res) => {
    if (req.method === 'POST' && !req.params.eventId) return createEventDraft(req, res);
    if (req.path.includes('/publish') || req.query.action === 'publish' || req.body.action === 'publish') return publishEvent(req, res);
    return updateEventByOrganizer(req, res);
};
module.exports = { createEventDraft, getOrganizerEvents, getOrganizerEventDetails, getOrganizerDashboardSummary, publishEvent, updateEventByOrganizer, manageOrganizerEvents, manageEventLifecycle };
