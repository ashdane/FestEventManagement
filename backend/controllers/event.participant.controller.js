const { Event, Organizer, Participant, ACTIVE_STATUSES, isRegOpen, isPPTelig, getActiveRegistrationCount,
    getTrendingMap } = require('./event.shared');
const { sendTicketMail } = require('../utils/mailer');
const esc = (v = '') => String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const linksFor = (event, timezone = 'UTC', reminderMinutes = 30) => {
    const title = event.event_name || 'Event';
    const details = `${event.event_description || ''}\nReminder: ${reminderMinutes} minutes before`;
    return {
        google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${stamp(event.event_start)}/${stamp(event.event_end)}&details=${encodeURIComponent(details)}&ctz=${encodeURIComponent(timezone)}`,
        outlook: `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${encodeURIComponent(new Date(event.event_start).toISOString())}&enddt=${encodeURIComponent(new Date(event.event_end).toISOString())}&body=${encodeURIComponent(details)}`
    };
};
const icsFor = (events, reminderMinutes = 30) =>
    `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FEMS//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n${events.map((event) => [
        'BEGIN:VEVENT',
        `UID:${event._id}@fems`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(event.event_start)}`,
        `DTEND:${stamp(event.event_end)}`,
        `SUMMARY:${esc(event.event_name || 'Event')}`,
        `DESCRIPTION:${esc(event.event_description || '')}`,
        'BEGIN:VALARM',
        `TRIGGER:-PT${Math.max(0, Number(reminderMinutes) || 0)}M`,
        'ACTION:DISPLAY',
        'DESCRIPTION:Event reminder',
        'END:VALARM',
        'END:VEVENT'
    ].join('\n')).join('\n')}\nEND:VCALENDAR\n`;

const getBrowsableEvents = async (req, res) => {
    try {
        const { q, eventType, eligibility, dateFrom, dateTo, followedOnly, trendingOnly } = req.query;
        const participant = await Participant.findById(req.user.id).select('orgs_of_interests areas_of_interests');
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        const mongoQuery = { status: { $in: ACTIVE_STATUSES } };
        if (eventType)
            mongoQuery.event_type = eventType;
        if (eligibility)
            mongoQuery.eligibility = eligibility;
        if (dateFrom || dateTo) {
            mongoQuery.event_start = {};
            if (dateFrom)
                mongoQuery.event_start.$gte = new Date(dateFrom);
            if (dateTo)
                mongoQuery.event_start.$lte = new Date(dateTo);
        }
        if (followedOnly === 'true')
            mongoQuery.org_id = { $in: participant.orgs_of_interests.map(String) };
        if (q)
            mongoQuery.$or = [
                { event_name: { $regex: q, $options: 'i' } },
                { event_tag: { $regex: q, $options: 'i' } }
            ];
        const events = await Event.find(mongoQuery).sort({ event_start: 1 }).lean();
        const organizerIds = [...new Set(events.map((event) => String(event.org_id)))];
        const organizers = await Organizer.find({ _id: { $in: organizerIds } }).select('org_name');
        const organizerMap = organizers.reduce((acc, org) => {
            acc[String(org._id)] = org.org_name || 'Organizer';
            return acc;
        }, {});
        const trendingMap = await getTrendingMap();
        let enrichedEvents = events.map((event) => ({
            ...event,
            organizer_name: organizerMap[String(event.org_id)] || 'Organizer',
            trending_count_24h: trendingMap[String(event._id)] || 0
        }));
        if (q) {
            const rx = new RegExp(q, 'i');
            enrichedEvents = enrichedEvents.filter((event) =>
                rx.test(event.event_name || '') ||
                rx.test(event.organizer_name || '') ||
                rx.test(Array.isArray(event.event_tag) ? event.event_tag.join(' ') : String(event.event_tag || ''))
            );
        }
        const followedSet = new Set((participant.orgs_of_interests || []).map(String));
        const interestToTags = {
            TECH_EVENTS: ['Technical', 'Workshops', 'Competitions'],
            CULTURAL_EVENTS: ['Cultural', 'Literary', 'Media'],
            ENTERTAINMENT: ['Cultural', 'Media'],
            NETWORKING: ['Talks', 'Workshops']
        };
        const preferredTags = new Set(
            (participant.areas_of_interests || []).flatMap((key) => interestToTags[key] || [])
        );
        const rankScore = (event) =>
            (event.trending_count_24h || 0) * 5 +
            (followedSet.has(String(event.org_id)) ? 3 : 0) +
            ((event.event_tag || []).some((tag) => preferredTags.has(tag)) ? 2 : 0);
        const ranked = [...enrichedEvents].sort((a, b) => rankScore(b) - rankScore(a) || new Date(a.event_start) - new Date(b.event_start));
        return res.status(200).json({
            trendingTop5: ranked.slice(0, 5),
            events:
                trendingOnly === 'true'
                    ? ranked.filter((item) => item.trending_count_24h > 0)
                    : ranked
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getEventDetailsForPPT = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        if (!event)
            return res.status(404).json({ error: 'Event not found' });
        const participant = await Participant.findById(req.user.id).select('registrations participant_type');
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        const organizer = await Organizer.findById(event.org_id).select('org_name email');
        const activeRegs = await getActiveRegistrationCount(event._id);
        const myRegistration =
            participant.registrations.find((reg) => String(reg.event_id) === String(event._id)) || null;
        return res.status(200).json({
            event: {
                ...event.toObject(),
                organizer_name: organizer?.org_name || 'Organizer',
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const registerForEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        if (!event)
            return res.status(404).json({ error: 'Event not found' });
        const participant = await Participant.findById(req.user.id);
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        if (!isRegOpen(event))
            return res.status(400).json({ error: 'Event is not open for registration' });
        if (!isPPTelig(event.eligibility, participant.participant_type))
            return res.status(403).json({ error: 'Participant is ineligible for this event' });
        const alreadyRegistered = (participant.registrations || []).some(
            (reg) => String(reg.event_id) === String(event._id)
        );
        if (alreadyRegistered)
            return res.status(400).json({ error: 'Already registered for this event' });
        const activeRegs = await getActiveRegistrationCount(event._id);
        if (activeRegs >= event.reg_limit)
            return res.status(400).json({ error: 'Registrations are full!' });
        const ticketId = `TKT-${event._id.toString().slice(-6).toUpperCase()}-${participant._id.toString()
            .slice(-6).toUpperCase()}`;
        participant.registrations.push({
            event_id: event._id,
            ticket_id: ticketId,
            participation_status: 'REGISTERED',
            team_name: req.body.team_name || 'N/A'
        });
        if (!event.form_locked) {
            event.form_locked = true;
            await event.save();
        }
        try {
            await sendTicketMail(
                participant.email, // Ensure your Participant model has this field
                event.event_name, 
                { 
                    ticket_id: ticketId, 
                    type: 'Normal',
                    participantName: `${participant.first_name} ${participant.last_name}`
                }
            );
        } catch (error) {
            console.error(error.message);
        }
        await participant.save();
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
        const organizers = await Organizer.find({ _id: { $in: organizerIds } }).select('org_name');
        const organizerMap = {};
        organizers.forEach((org) => {
            organizerMap[String(org._id)] = org.org_name;
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
const getMyCalendarLinks = async (req, res) => {
    try {
        const participant = await Participant.findById(req.user.id).select('registrations.event_id');
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        const ids = (participant.registrations || []).map((r) => r.event_id).filter(Boolean);
        const events = await Event.find({ _id: { $in: ids } }).select('event_name event_description event_start event_end');
        const timezone = req.query.timezone || 'UTC';
        const reminderMinutes = Number(req.query.reminderMinutes || 30);
        return res.status(200).json({
            links: events.map((event) => ({ event_id: event._id, event_name: event.event_name, ...linksFor(event, timezone, reminderMinutes) }))
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const exportCalendarIcs = async (req, res) => {
    try {
        const participant = await Participant.findById(req.user.id).select('registrations.event_id');
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        const requested = (req.query.eventIds || '').split(',').map((id) => id.trim()).filter(Boolean);
        const registered = new Set((participant.registrations || []).map((r) => String(r.event_id)));
        const ids = requested.length ? requested.filter((id) => registered.has(id)) : [...registered];
        const events = await Event.find({ _id: { $in: ids } }).select('event_name event_description event_start event_end');
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="fems-events.ics"');
        return res.status(200).send(icsFor(events, Number(req.query.reminderMinutes || 30)));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const getEventDiscovery = async (req, res) => {
    if (req.params.eventId) {
        return getEventDetailsForPPT(req, res);
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
    getEventDetailsForPPT,
    registerForEvent,
    getMyEventsDashboard,
    getMyCalendarLinks,
    exportCalendarIcs,
    getEventDiscovery,
    handleRegistration
};
