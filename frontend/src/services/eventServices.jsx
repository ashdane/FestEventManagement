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
const getOrganizerEventDetails = async (token, eventId, filters = {}) => {
    const qs = HTTP_CLIENT.buildQueryString(filters);
    return HTTP_CLIENT.request(`/api/events/organizer/${eventId}${qs}`, { token });
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
const getEventDetails = async (token, eventId) => {
    return HTTP_CLIENT.request(`/api/events/${eventId}`, { token });
};
const registerForEvent = async (token, eventId, payload = {}) => {
    return HTTP_CLIENT.request(`/api/events/${eventId}/register`, { method: 'POST', token, body: payload });
};
const getMyEventsDashboard = async (token) => {
    return HTTP_CLIENT.request('/api/events/my-dashboard', { token });
};
const getCalendarLinks = async (token, options = {}) => {
    const queryString = HTTP_CLIENT.buildQueryString(options);
    return HTTP_CLIENT.request(`/api/events/calendar/links${queryString}`, { token });
};
const getCalendarIcsUrl = (options = {}) => {
    const queryString = HTTP_CLIENT.buildQueryString(options);
    return HTTP_CLIENT.buildUrl(`/api/events/calendar/export.ics${queryString}`);
};
const getForum = async (token, eventId, options = {}) => {
    const qs = HTTP_CLIENT.buildQueryString(options);
    return HTTP_CLIENT.request(`/api/events/${eventId}/forum${qs}`, { token });
};
const postForum = async (token, eventId, body) => {
    return HTTP_CLIENT.request(`/api/events/${eventId}/forum`, { method: 'POST', token, body });
};
const reactForum = async (token, eventId, messageId, emoji) => {
    return HTTP_CLIENT.request(`/api/events/${eventId}/forum/${messageId}/react`, { method: 'POST', token, body: { emoji } });
};
const pinForum = async (token, eventId, messageId, pinned) => {
    return HTTP_CLIENT.request(`/api/events/${eventId}/forum/${messageId}/pin`, { method: 'PATCH', token, body: { pinned } });
};
const deleteForum = async (token, eventId, messageId) => {
    return HTTP_CLIENT.request(`/api/events/${eventId}/forum/${messageId}`, { method: 'DELETE', token });
};
const forumNotifications = async (token, eventId, since) => {
    const qs = HTTP_CLIENT.buildQueryString({ since });
    return HTTP_CLIENT.request(`/api/events/${eventId}/forum/notifications${qs}`, { token });
};
const scanAttendance = async (token, ticketId) => {
    return HTTP_CLIENT.request('/api/events/attendance/scan', { method: 'PUT', token, body: { ticketId } });
};
const getAttendanceDashboard = async (token, eventId) => {
    return HTTP_CLIENT.request(`/api/events/attendance/dashboard/${eventId}`, { token });
};
const getAttendanceCsvUrl = (eventId) => HTTP_CLIENT.buildUrl(`/api/events/attendance/export/${eventId}`);
const manualOverrideAttendance = async (token, payload) => {
    return HTTP_CLIENT.request('/api/events/attendance/manual-override', { method: 'PUT', token, body: payload });
};
const getAttendanceAudit = async (token, eventId) => {
    return HTTP_CLIENT.request(`/api/events/attendance/audit/${eventId}`, { token });
};
const buyMerchandise = async (token, payload) => {
    const formData = new FormData();
    Object.entries(payload || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') formData.append(k, v);
    });
    return HTTP_CLIENT.request('/api/events/merchandise/purchase', { method: 'POST', token, body: formData });
};
const approveMerchandisePayment = async (token, ticketId) => {
    return HTTP_CLIENT.request(`/api/events/merchandise/approve/${ticketId}`, { method: 'PUT', token });
};
const rejectMerchandisePayment = async (token, ticketId) => {
    return HTTP_CLIENT.request(`/api/events/merchandise/reject/${ticketId}`, { method: 'PUT', token });
};
export default {
    createEventDraft,
    getOrganizerEvents,
    getOrganizerDashboardSummary,
    getOrganizerEventDetails,
    updateOrganizerEvent,
    publishEvent,
    getEventRegistrationForm,
    saveEventRegistrationForm,
    browseEvents,
    getEventDetails,
    registerForEvent,
    getMyEventsDashboard,
    getForum,
    postForum,
    reactForum,
    pinForum,
    deleteForum,
    forumNotifications,
    getCalendarLinks,
    getCalendarIcsUrl,
    scanAttendance,
    getAttendanceDashboard,
    getAttendanceCsvUrl,
    manualOverrideAttendance,
    getAttendanceAudit,
    buyMerchandise,
    approveMerchandisePayment,
    rejectMerchandisePayment
};
