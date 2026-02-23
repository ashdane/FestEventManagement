import HTTP_CLIENT from './httpClient';

const getOrganizers = async () => {
    return HTTP_CLIENT.request('/api/home/organizers');
};

export default {
    getOrganizers
};
