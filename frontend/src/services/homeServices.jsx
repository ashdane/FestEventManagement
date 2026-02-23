import HTTP_CLIENT from './httpClient';
const getOrganizers = async () => {
    return HTTP_CLIENT.request('/api/home/organizers');
};
const getOrganizerProfile = async (token) => {
    return HTTP_CLIENT.request('/api/home/organizer/me', { token });
};
const updateOrganizerProfile = async (token, body) => {
    return HTTP_CLIENT.request('/api/home/organizer/me', { method: 'PATCH', token, body });
};
export default {
    getOrganizers,
    getOrganizerProfile,
    updateOrganizerProfile
};
