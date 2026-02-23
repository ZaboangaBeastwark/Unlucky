// js/api.js

const API_BASE = 'api/';

/**
 * Wrapper for API calls using fetch
 * @param {string} endpoint - The API endpoint
 * @param {string} method - GET, POST, etc.
 * @param {object} data - JSON payload
 * @returns {Promise<object>}
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    const url = API_BASE + endpoint;
    const options = {
        method,
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
        let result;

        try {
            result = await response.json();
        } catch (e) {
            // Handle cases where response isn't JSON
            const text = await response.text();
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
