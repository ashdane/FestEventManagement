const buildHeaders = (token, includeJson = false) => {
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (includeJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};
const buildQueryString = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
            if (value) query.set(key, 'true');
            return;
        }
        if (value !== '' && value !== null && value !== undefined) {
            query.set(key, value);
        }
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};
const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : null;
    if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
    }
    return data;
};
const request = async (url, { method = 'GET', token, body } = {}) => {
    const hasBody = body !== undefined;
    const response = await fetch(url, {
        method,
        headers: buildHeaders(token, hasBody),
        body: hasBody ? JSON.stringify(body) : undefined
    });
    return parseResponse(response);
};
export default {
    request,
    buildQueryString
};
