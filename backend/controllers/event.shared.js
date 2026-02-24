const Event = require('../models/Events');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');
const formFields = ['event_name','event_description', 'event_type','eligibility','reg_deadline', 'event_start', 'event_end', 'reg_limit', 'reg_fee', 'event_tag', 'stockqty', 'merchandiseDetails'];
const ACTIVE_STATUSES = ['PUBLISHED', 'ONGOING'];
const ACTIVE_REG_STATUSES = ['REGISTERED', 'COMPLETED'];
const formStatus = (event) => {
    if (!event) return 'DRAFT';
    if (['DRAFT', 'COMPLETED', 'CLOSED'].includes(event.status)) return event.status;
    const now = Date.now();
    const start = new Date(event.event_start).getTime();
    const end = new Date(event.event_end).getTime();
    if (now > end) return 'CLOSED';
    if (now >= start) return 'ONGOING';
    return event.status;
};
const formatOrgEvent = (form) => {
    const event = typeof form.toObject === 'function' ? form.toObject() : { ...form }; // ...form creates a new object and "spreads" props of form into that new obj //basically clones it along with unneeded props
    event.effective_status = formStatus(form);
    return event;
};
const isRegOpen = (event) => {
    const now = Date.now();
    const status = formStatus(event);
    return ( ACTIVE_STATUSES.includes(status) && !event.registration_closed &&
        new Date(event.reg_deadline).getTime() > now);
};
const isPPTelig = (elig, pType, email = '') => {
    const t = String(pType || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const e = String(elig || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const mail = String(email || '').trim().toLowerCase();
    const iiitByMail = /@(([\w-]+\.)?students\.iiit\.ac\.in|([\w-]+\.)?research\.iiit\.ac\.in|([\w-]+\.)?iiit\.ac\.in)$/.test(mail);
    const isIiit = ['ITST', 'IIIT', 'IIIT_STUDENT'].includes(t) || (t.includes('IIIT') && !t.includes('NON')) || iiitByMail;
    const isNonIiit = ['NITST', 'NON_IIIT', 'NONIIIT'].includes(t) || t.includes('NON_IIIT') || t.includes('NONIIIT') || (!isIiit && !!mail);
    return e === 'ALL' || (e === 'IIIT' && isIiit) || (e === 'NON_IIIT' && isNonIiit);
};
const getActiveRegistrationCount = async (eventId) =>
    Participant.countDocuments({
        registrations: {
            $elemMatch: {
                event_id: eventId,
                participation_status: { $in: ACTIVE_REG_STATUSES }
            }
        }
    });
const getEventStats = async (eventId) => {
    const stats = await Participant.aggregate([
        { $unwind: '$registrations' },
        { $match: { 'registrations.event_id': eventId } },
        {
            $group: {
                _id: null,
                regCount: {
                    $sum: { $cond: [{ $in: ['$registrations.participation_status', ACTIVE_REG_STATUSES] }, 1, 0] }
                },
                attendance: {
                    $sum: { $cond: [{ $eq: ['$registrations.participation_status', 'COMPLETED'] }, 1, 0] }
                }
            }
        }
    ]);
    return { registrationsCount: stats[0]?.regCount || 0, attendanceCount: stats[0]?.attendance || 0 };
};
const getTrendingMap = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const grouped = await Participant.aggregate([
        { $unwind: '$registrations' },
        { $match: { 'registrations.registered_at': { $gte: since } } },
        { $group: { _id: '$registrations.event_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    return grouped.reduce((map, item) => {
        map[String(item._id)] = item.count;
        return map;
    }, {});
};
module.exports = {
    Event,
    Organizer,
    Participant,
    formFields,
    ACTIVE_STATUSES,
    formStatus,
    formatOrgEvent,
    isRegOpen,
    isPPTelig,
    getActiveRegistrationCount,
    getEventStats,
    getTrendingMap
};
