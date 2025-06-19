import { initializeApiClient, fetchWithAuth as clientFetch } from '../../../shared/apiClient.js';
import { getToken, logout } from '../modules/auth.js';

// Initialize the shared client with the frontend's auth functions
initializeApiClient({
    getToken: getToken,
    logout: logout
});

// Export the configured fetch function for the rest of the frontend to use
export const fetchWithAuth = clientFetch;