// This is the new shared API client. It's generic and can be used by any part of the app.

let _getToken = () => null;
let _logout = () => {};

/**
 * Initializes the API client with functions to get the auth token and log out.
 * @param {object} config - The configuration object.
 * @param {() => string | null} config.getToken - A function that returns the auth token.
 * @param {() => void} config.logout - A function to handle user logout on auth failure.
 */
export function initializeApiClient(config) {
    _getToken = config.getToken;
    _logout = config.logout;
}

/**
 * Performs an authenticated fetch request.
 * @param {string} endpoint - The API endpoint (e.g., '/notes/folders').
 * @param {object} options - Optional fetch options (method, body, etc.).
 * @returns {Promise<any>} - The JSON response from the API.
 */
export async function fetchWithAuth(endpoint, options = {}) {
    const token = _getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        // Assuming all API calls are relative to the root
        const response = await fetch(`/api/v1${endpoint}`, { ...options, headers });

        if (response.status === 401) {
            _logout();
            throw new Error("Unauthorized: Logging out.");
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'An API error occurred');
        }

        // Return null for 204 No Content responses, otherwise return JSON
        return response.status === 204 ? null : response.json();
    } catch (error) {
        console.error('API Fetch Error:', error.message);
        throw error; // Re-throw the error to be handled by the caller
    }
}