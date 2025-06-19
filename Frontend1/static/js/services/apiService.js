import { getToken, logout } from '../modules/auth.js';

export async function fetchWithAuth(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    try {
        const response = await fetch(`/api/v1${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            logout();
            throw new Error("Unauthorized: Logging out.");
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'An API error occurred');
        }
        return response.status === 204 ? null : response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}