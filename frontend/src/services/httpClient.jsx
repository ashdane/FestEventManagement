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
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const buildUrl = (url) => {
    if (!API_BASE) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
};
const detectTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
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
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = buildHeaders(token, hasBody && !isFormData);
    headers['X-Timezone'] = detectTimezone();
    const response = await fetch(buildUrl(url), {
        method,
        headers,
        body: hasBody ? (isFormData ? body : JSON.stringify(body)) : undefined
    });
    return parseResponse(response);
};
export default {
    request,
    buildQueryString,
    buildUrl
};
