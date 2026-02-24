import HTTP_CLIENT from './httpClient';
const getMyProfile = async (token) => {
    return HTTP_CLIENT.request('/api/participants/me', { token });
};
const updateMyProfile = async (token, payload) => {
    return HTTP_CLIENT.request('/api/participants/me', {
        method: 'PATCH',
        token,
        body: payload
    });
};
const changeMyPassword = async (token, payload) => {
    return HTTP_CLIENT.request('/api/participants/me/password', {
        method: 'PATCH',
        token,
        body: payload
    });
};
const getOrganizersList = async (token) => {
    return HTTP_CLIENT.request('/api/participants/organizers', { token });
};
const getOrganizerDetails = async (token, organizerId) => {
    return HTTP_CLIENT.request(`/api/participants/organizers/${organizerId}`, { token });
};
const followOrganizer = async (token, organizerId) => {
    return HTTP_CLIENT.request(`/api/participants/organizers/${organizerId}/follow`, { method: 'PATCH', token });
};
const unfollowOrganizer = async (token, organizerId) => {
    return HTTP_CLIENT.request(`/api/participants/organizers/${organizerId}/unfollow`, { method: 'PATCH', token });
};
export default {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
    getOrganizersList,
    getOrganizerDetails,
    followOrganizer,
    unfollowOrganizer
};
