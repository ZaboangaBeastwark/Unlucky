// js/api.js

const API_BASE = 'api/';

/**
 * Wrapper for API calls using fetch
 * @param {string} endpoint - The API endpoint
 * @param {string} method - GET, POST, etc.
 * @param {object} data - JSON payload
 * @returns {Promise<object>}
 */
async function apiRequest(endpoint, method = 'GET', data = null, params = null) {
    let url = API_BASE + endpoint;
    if (params) {
        const query = new URLSearchParams(params).toString();
        url += '?' + query;
    }
    const options = {
        method,
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        let result;

        try {
            result = text ? JSON.parse(text) : {};
        } catch (e) {
            throw new Error(`Invalid JSON response: ${text}`);
        }

        if (!response.ok) {
            const errorObj = new Error(result.error || 'API Request Failed');
            errorObj.status = response.status;
            throw errorObj;
        }

        return result;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

// Alias for backward compatibility
const apiCall = apiRequest;
