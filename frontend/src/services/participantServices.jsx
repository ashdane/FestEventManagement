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

export default {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
};
