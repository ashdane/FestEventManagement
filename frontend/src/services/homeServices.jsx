import HTTP_CLIENT from './httpClient';
const getOrganizers = async () => {
    return HTTP_CLIENT.request('/api/home/organizers');
};
const get_org_details = async (token) => {
    return HTTP_CLIENT.request('/api/home/organizer/me', { token });
};
const update_org_details = async (token, body) => {
    return HTTP_CLIENT.request('/api/home/organizer/me', { method: 'PATCH', token, body });
};
const requestReset = async (token, reason) => {
    return HTTP_CLIENT.request('/api/home/request-reset', { method: 'POST', token, body: { reason } });
};
const getMyResetHistory = async (token) => {
    return HTTP_CLIENT.request('/api/home/request-reset/history', { token });
};
export default {
    getOrganizers,
    get_org_details,
    update_org_details,
    requestReset,
    getMyResetHistory
};
