const Event = require('../models/Events');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');

const formFields = ['event_name','event_description', 'event_type','eligibility','reg_deadline', 'event_start', 'event_end', 'reg_limit', 'reg_fee', 'event_tag'];

const ACTIVE_STATUSES = ['PUBLISHED', 'ONGOING'];
const ACTIVE_REG_STATUSES = ['REGISTERED', 'COMPLETED'];

const formatOrgEvent = (form) => {
    const event = typeof form.toObject === 'function' ? form.toObject() : { ...form }; // ...form creates a new object and "spreads" props of form into that new obj //basically clones it along with unneeded props
    event.status = formStatus(form);
    return event;
};

const isRegOpen = (event) => {
    const now = Date.now();
    const status = formStatus(event);
    return ( ACTIVE_STATUSES.includes(status) && !event.registration_closed &&
        new Date(event.reg_deadline).getTime() > now);
};

const isPPTelig = (elig, pType) => {
    return (elig === 'ALL' ||
         (elig === 'IIIT') && (pType === 'ITST') ||
         (elig === 'NON_IIIT') && (pType === 'NITST'))
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

module.exports = {
    Event,
    Organizer,
    Participant,
    formFields,
    ACTIVE_STATUSES,
    formatOrgEvent,
    isRegOpen,
    isPPTelig,
    getActiveRegistrationCount,
};
