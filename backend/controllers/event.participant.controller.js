const { Event, Organizer, Participant, ACTIVE_STATUSES, isRegOpen, isPPTelig, getActiveRegistrationCount,
    getTrendingMap } = require('./event.shared');
const { sendTicketMail } = require('../utils/mailer');
const Ticket = require('../models/Ticket');
const esc = (v = '') => String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const norm = (v = '') => String(v).toLowerCase().trim();
const levenshtein = (a = '', b = '') => {
    const x = norm(a), y = norm(b);
    if (!x) return y.length;
    if (!y) return x.length;
    const dp = Array.from({ length: x.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= y.length; j++) dp[0][j] = j;
    for (let i = 1; i <= x.length; i++) {
        for (let j = 1; j <= y.length; j++) {
            const cost = x[i - 1] === y[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[x.length][y.length];
};
const fuzzyMatch = (text = '', query = '') => {
    const t = norm(text), q = norm(query);
    if (!q) return true;
    if (t.includes(q)) return true;
    const maxDist = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3;
    const words = t.split(/[^a-z0-9]+/).filter(Boolean);
    return words.some((w) => levenshtein(w, q) <= maxDist || levenshtein(w.slice(0, q.length), q) <= maxDist);
};
const validTimezone = (tz) => {
    try {
        if (!tz) return false;
        Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
        return true;
    } catch {
        return false;
    }
};
const resolveTimezone = (req) => {
    const candidate = req.query.timezone || req.headers['x-timezone'];
    return validTimezone(candidate) ? candidate : 'UTC';
};
const normalizeReminder = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 30;
    return Math.max(0, Math.min(1440, Math.round(n)));
};
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
            enrichedEvents = enrichedEvents.filter((event) =>
                fuzzyMatch(event.event_name || '', q) ||
                fuzzyMatch(event.organizer_name || '', q) ||
                fuzzyMatch(Array.isArray(event.event_tag) ? event.event_tag.join(' ') : String(event.event_tag || ''), q)
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
        const participant = await Participant.findById(req.user.id).select('registrations participant_type email');
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        const organizer = await Organizer.findById(event.org_id).select('org_name email');
        const activeRegs = await getActiveRegistrationCount(event._id);
        const myRegistration =
            participant.registrations.find((reg) => String(reg.event_id) === String(event._id)) || null;
        const myMerchOrders = event.event_type === 'Merchandise'
            ? await Ticket.find({ eventId: event._id, participantId: participant._id, status: { $ne: 'Rejected' } }).select('status merchandiseDetails.qty ticketId createdAt').sort({ createdAt: -1 })
            : [];
        const myQty = myMerchOrders.reduce((sum, t) => sum + Number(t.merchandiseDetails?.qty || 0), 0);
        const merchLimit = Number(event.merchandiseDetails?.purchaseLimitPerParticipant || 1);
        const participantType = participant.participant_type || req.user.participant_type;
        const regOpen = isRegOpen(event);
        const eligOk = isPPTelig(event.eligibility, participantType, participant.email);
        const stockLeft = Number(event.stockqty ?? event.reg_limit ?? 0);
        const stockOk = stockLeft > 0;
        const merchLimitOk = myQty < merchLimit;
        const normalCapacityOk = activeRegs < Number(event.reg_limit || 0);
        const normalNewUserOk = !myRegistration;
        const merchCanPurchase = regOpen && stockOk && eligOk && merchLimitOk;
        const normalCanRegister = regOpen && normalCapacityOk && normalNewUserOk && eligOk;
        const blockingReason = event.event_type === 'Merchandise'
            ? (!regOpen ? 'Registration deadline passed or registrations closed'
                : !eligOk ? 'You are not eligible for this event'
                : !stockOk ? 'Merchandise is out of stock'
                : !merchLimitOk ? `Purchase limit reached (${merchLimit})`
                : '')
            : (!regOpen ? 'Registration deadline passed or registrations closed'
                : !eligOk ? 'You are not eligible for this event'
                : !normalCapacityOk ? 'Registration limit reached'
                : !normalNewUserOk ? 'Already registered for this event'
                : '');
        return res.status(200).json({
            event: {
                ...event.toObject(),
                organizer_name: organizer?.org_name || 'Organizer',
                organizer_email: organizer?.email || '',
                active_registrations: activeRegs
            },
            canRegister: event.event_type === 'Merchandise' ? merchCanPurchase : normalCanRegister,
            blockingReason,
            myRegistration: event.event_type === 'Merchandise'
                ? (myMerchOrders[0] ? { ticket_id: myMerchOrders[0].ticketId, participation_status: myMerchOrders[0].status } : null)
                : myRegistration
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
        const participantType = participant.participant_type || req.user.participant_type;
        if (!isPPTelig(event.eligibility, participantType, participant.email))
            return res.status(403).json({ error: 'Participant is ineligible for this event' });
        const activeRegs = await getActiveRegistrationCount(event._id);
        if (activeRegs >= event.reg_limit)
            return res.status(400).json({ error: 'Registrations are full!' });
        const ticketId = `TKT-${event._id.toString().slice(-6).toUpperCase()}-${participant._id.toString()
            .slice(-6).toUpperCase()}`;
        const formResponses = req.body?.formResponses && typeof req.body.formResponses === 'object'
            ? req.body.formResponses
            : {};
        const updated = await Participant.findOneAndUpdate(
            {
                _id: req.user.id,
                registrations: { $not: { $elemMatch: { event_id: event._id } } }
            },
            {
                $push: {
                    registrations: {
                        event_id: event._id,
                        ticket_id: ticketId,
                        form_responses: formResponses,
                        participation_status: 'REGISTERED',
                        team_name: req.body.team_name || 'N/A'
                    }
                }
            },
            { new: true }
        );
        if (!updated) return res.status(400).json({ error: 'Already registered for this event' });
        if (!event.form_locked) {
            event.form_locked = true;
            await event.save();
        }
        try {
            await sendTicketMail(
                participant.email, // Ensure your Participant model has this field
                event.event_name, 
                { 
                    ticketId, 
                    type: 'Normal',
                    participantName: `${participant.first_name} ${participant.last_name}`
                }
            );
        } catch (error) {
            console.error(error.message);
        }
        return res.status(201).json({ message: 'Registration successful', ticket_id: ticketId });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const getMyEventsDashboard = async (req, res) => {
    try {
        const [participant, merchTickets] = await Promise.all([
            Participant.findById(req.user.id).select('registrations').populate('registrations.event_id'),
            Ticket.find({ participantId: req.user.id, type: 'Merchandise' }).populate('eventId')
        ]);
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        const registrations = participant.registrations || [];
        const tickets = merchTickets || [];
        const organizerIds = [
            ...new Set(
                registrations
                    .map((reg) => reg.event_id?.org_id)
                    .concat(tickets.map((t) => t.eventId?.org_id))
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
        const normalRecords = registrations
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
        const merchRecords = tickets
            .filter((t) => t.eventId)
            .map((t) => {
                const event = t.eventId;
                return {
                    event_id: event._id,
                    event_name: event.event_name,
                    event_type: 'Merchandise',
                    organizer: organizerMap[String(event.org_id)] || 'Organizer',
                    schedule: `${new Date(event.event_start).toLocaleDateString()} - ${new Date(event.event_end).toLocaleDateString()}`,
                    participation_status: t.status,
                    team_name: 'N/A',
                    ticket_id: t.ticketId,
                    isUpcoming: new Date(event.event_start) >= now
                };
            });
        const eventRecords = [...normalRecords, ...merchRecords];
        return res.status(200).json({
            upcomingEvents: eventRecords.filter((record) => record.isUpcoming && !['REJECTED', 'Rejected', 'CANCELLED', 'Cancelled'].includes(record.participation_status)),
            participationHistory: {
                Normal: normalRecords,
                Merchandise: eventRecords.filter((record) => record.event_type === 'Merchandise'),
                Completed: eventRecords.filter((record) => ['COMPLETED', 'Successful'].includes(record.participation_status)),
                CancelledRejected: eventRecords.filter((record) =>
                    ['CANCELLED', 'REJECTED', 'Rejected', 'Cancelled'].includes(record.participation_status)
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
        const [participant, merchTickets] = await Promise.all([
            Participant.findById(req.user.id).select('registrations.event_id'),
            Ticket.find({
                participantId: req.user.id,
                type: 'Merchandise',
                status: { $nin: ['Rejected', 'Cancelled'] }
            }).select('eventId')
        ]);
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        const requested = (req.query.eventIds || '').split(',').map((id) => id.trim()).filter(Boolean);
        const registered = new Set(
            (participant.registrations || []).map((r) => String(r.event_id))
                .concat((merchTickets || []).map((t) => String(t.eventId)))
        );
        const ids = (requested.length ? requested.filter((id) => registered.has(id)) : [...registered]).filter(Boolean);
        const events = await Event.find({ _id: { $in: ids } }).select('event_name event_description event_start event_end');
        const timezone = resolveTimezone(req);
        const reminderMinutes = normalizeReminder(req.query.reminderMinutes);
        return res.status(200).json({
            timezone,
            reminderMinutes,
            links: events.map((event) => ({ event_id: event._id, event_name: event.event_name, ...linksFor(event, timezone, reminderMinutes) }))
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const exportCalendarIcs = async (req, res) => {
    try {
        const [participant, merchTickets] = await Promise.all([
            Participant.findById(req.user.id).select('registrations.event_id'),
            Ticket.find({
                participantId: req.user.id,
                type: 'Merchandise',
                status: { $nin: ['Rejected', 'Cancelled'] }
            }).select('eventId')
        ]);
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        const requested = (req.query.eventIds || '').split(',').map((id) => id.trim()).filter(Boolean);
        const registered = new Set(
            (participant.registrations || []).map((r) => String(r.event_id))
                .concat((merchTickets || []).map((t) => String(t.eventId)))
        );
        const ids = requested.length ? requested.filter((id) => registered.has(id)) : [...registered];
        const events = await Event.find({ _id: { $in: ids } }).select('event_name event_description event_start event_end');
        const reminderMinutes = normalizeReminder(req.query.reminderMinutes);
        const timezone = resolveTimezone(req);
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="fems-events.ics"');
        res.setHeader('X-Calendar-Timezone', timezone);
        return res.status(200).send(icsFor(events, reminderMinutes));
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
