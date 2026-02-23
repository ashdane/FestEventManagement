const {
    Event,
    Organizer,
    Participant,
    ACTIVE_STATUSES,
    isRegOpen,
    isPPTelig,
    getActiveRegistrationCount,
    getTrendingMap
} = require('./event.shared');
const getBrowsableEvents = async (req, res) => {
    try {
        const { q, eventType, eligibility, dateFrom, dateTo, followedOnly, trendingOnly } = req.query;
        const participant = await Participant.findById(req.user.id).select('orgs_of_interests');
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        const mongoQuery = { status: { $in: ACTIVE_STATUSES } };
        if (eventType) mongoQuery.event_type = eventType;
        if (eligibility) mongoQuery.eligibility = eligibility;
        if (dateFrom || dateTo) {
            mongoQuery.event_start = {};
            if (dateFrom) mongoQuery.event_start.$gte = new Date(dateFrom);
            if (dateTo) mongoQuery.event_start.$lte = new Date(dateTo);
        }
        if (followedOnly === 'true') {
            mongoQuery.org_id = { $in: participant.orgs_of_interests.map(String) };
        }
        if (q) {
            mongoQuery.$or = [
                { event_name: { $regex: q, $options: 'i' } },
                { event_tag: { $regex: q, $options: 'i' } }
            ];
        }
        const events = await Event.find(mongoQuery).sort({ event_start: 1 });
        const trendingMap = await getTrendingMap();
        const enrichedEvents = events.map((event) => ({
            ...event.toObject(),
            trending_count_24h: trendingMap[String(event._id)] || 0
        }));
        const ranked = [...enrichedEvents].sort((a, b) => b.trending_count_24h - a.trending_count_24h);
        return res.status(200).json({
            trendingTop5: ranked.slice(0, 5),
            events:
                trendingOnly === 'true'
                    ? enrichedEvents.filter((item) => item.trending_count_24h > 0)
                    : enrichedEvents
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getEventDetailsForParticipant = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        const participant = await Participant.findById(req.user.id).select('registrations participant_type');
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        const organizer = await Organizer.findById(event.org_id).select('organization_name email');
        const activeRegs = await getActiveRegistrationCount(event._id);
        const myRegistration =
            participant.registrations.find((reg) => String(reg.event_id) === String(event._id)) || null;
        return res.status(200).json({
            event: {
                ...event.toObject(),
                organizer_name: organizer?.organization_name || 'Organizer',
                organizer_email: organizer?.email || '',
                active_registrations: activeRegs
            },
            canRegister:
                isRegOpen(event) &&
                activeRegs < event.reg_limit &&
                !myRegistration &&
                isPPTelig(event.eligibility, participant.participant_type),
            myRegistration
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const registerForEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        const participant = await Participant.findById(req.user.id);
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        if (!isRegOpen(event)) {
            return res.status(400).json({ error: 'Event is not open for registration' });
        }
        if (!isPPTelig(event.eligibility, participant.participant_type)) {
            return res.status(403).json({ error: 'Participant is not eligible for this event' });
        }
        const alreadyRegistered = (participant.registrations || []).some(
            (reg) => String(reg.event_id) === String(event._id)
        );
        if (alreadyRegistered) return res.status(400).json({ error: 'Already registered for this event' });
        const activeRegs = await getActiveRegistrationCount(event._id);
        if (activeRegs >= event.reg_limit) {
            return res.status(400).json({ error: 'Registration limit exhausted' });
        }
        const ticketId = `TKT-${event._id.toString().slice(-6).toUpperCase()}-${participant._id
            .toString()
            .slice(-6)
            .toUpperCase()}`;
        participant.registrations.push({
            event_id: event._id,
            ticket_id: ticketId,
            participation_status: 'REGISTERED',
            team_name: req.body.team_name || 'N/A'
        });
        await participant.save();
        if (!event.form_locked) {
            event.form_locked = true;
            await event.save();
        }
        return res.status(201).json({ message: 'Registration successful', ticket_id: ticketId });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const getMyEventsDashboard = async (req, res) => {
    try {
        const participant = await Participant.findById(req.user.id)
            .select('registrations')
            .populate('registrations.event_id');
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        const registrations = participant.registrations || [];
        const organizerIds = [
            ...new Set(
                registrations
                    .map((reg) => reg.event_id?.org_id)
                    .filter(Boolean)
                    .map((id) => String(id))
            )
        ];
        const organizers = await Organizer.find({ _id: { $in: organizerIds } }).select('organization_name');
        const organizerMap = {};
        organizers.forEach((org) => {
            organizerMap[String(org._id)] = org.organization_name;
        });
        const now = new Date();
        const eventRecords = registrations
            .filter((reg) => reg.event_id)
            .map((reg) => {
                const event = reg.event_id;
                return {
                    event_id: event._id,
                    event_name: event.event_name,
                    event_type: event.event_type || 'Normal',
                    organizer: organizerMap[String(event.org_id)] || 'Organizer',
                    schedule: `${new Date(event.event_start).toLocaleDateString()} - ${new Date(
                        event.event_end
                    ).toLocaleDateString()}`,
                    participation_status: reg.participation_status,
                    team_name: reg.team_name || 'N/A',
                    ticket_id: reg.ticket_id,
                    isUpcoming: new Date(event.event_start) >= now
                };
            });
        return res.status(200).json({
            upcomingEvents: eventRecords.filter((record) => record.isUpcoming),
            participationHistory: {
                Normal: eventRecords.filter((record) => record.event_type === 'Normal'),
                Merchandise: eventRecords.filter((record) => record.event_type === 'Merchandise'),
                Completed: eventRecords.filter((record) => record.participation_status === 'COMPLETED'),
                CancelledRejected: eventRecords.filter((record) =>
                    ['CANCELLED', 'REJECTED'].includes(record.participation_status)
                )
            },
            eventRecords
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getEventDiscovery = async (req, res) => {
    if (req.params.eventId) {
        return getEventDetailsForParticipant(req, res);
    }
    return getBrowsableEvents(req, res);
};
const handleRegistration = async (req, res) => {
    if (req.method === 'POST' && req.params.eventId) {
        return registerForEvent(req, res);
    }
    return getMyEventsDashboard(req, res);
};
module.exports = {
    getBrowsableEvents,
    getEventDetailsForParticipant,
    registerForEvent,
    getMyEventsDashboard,
    getEventDiscovery,
    handleRegistration
};
