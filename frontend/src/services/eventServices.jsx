import HTTP_CLIENT from './httpClient';

const createEventDraft = async (token, payload) => {
    return HTTP_CLIENT.request('/api/events', {
        method: 'POST',
        token,
        body: payload
    });
};

const getOrganizerEvents = async (token) => {
    return HTTP_CLIENT.request('/api/events/organizer/my-events', { token });
};

const getOrganizerDashboardSummary = async (token) => {
    return HTTP_CLIENT.request('/api/events/organizer/dashboard-summary', { token });
};

const updateOrganizerEvent = async (token, eventId, payload) => {
    return HTTP_CLIENT.request(`/api/events/organizer/${eventId}`, {
        method: 'PATCH',
        token,
        body: payload
    });
};

const publishEvent = async (token, eventId) => {
    return HTTP_CLIENT.request(`/api/events/organizer/${eventId}/publish`, {
        method: 'PATCH',
        token
    });
};

const getEventRegistrationForm = async (token, eventId) => {
    return HTTP_CLIENT.request(`/api/events/organizer/${eventId}/form`, { token });
};

const saveEventRegistrationForm = async (token, eventId, registrationLayout) => {
    return HTTP_CLIENT.request(`/api/events/organizer/${eventId}/form`, {
        method: 'PUT',
        token,
        body: { registrationLayout }
    });
};

const browseEvents = async (token, filters = {}) => {
    const queryString = HTTP_CLIENT.buildQueryString(filters);
    return HTTP_CLIENT.request(`/api/events${queryString}`, { token });
};

export default {
    createEventDraft,
    getOrganizerEvents,
    getOrganizerDashboardSummary,
    updateOrganizerEvent,
    publishEvent,
    getEventRegistrationForm,
    saveEventRegistrationForm,
    browseEvents
};
