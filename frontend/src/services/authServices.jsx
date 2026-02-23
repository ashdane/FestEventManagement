import HTTP_CLIENT from './httpClient';

const SignupAPI = async (data) => {
    return HTTP_CLIENT.request('/api/auth/signup', {
        method: 'POST',
        body: data
    });
};

const LoginAPI = async (data) => {
    return HTTP_CLIENT.request('/api/auth/login', {
        method: 'POST',
        body: data
    });
};

const LogoutAPI = async (token) => {
    return HTTP_CLIENT.request('/api/auth/logout', {
        method: 'POST',
        token
    });
};

export default { SignupAPI, LoginAPI, LogoutAPI };
