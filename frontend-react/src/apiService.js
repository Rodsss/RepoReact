// This function is the new core of our API communication.
// It automatically adds the base URL and the authentication token to every request.
async function apiFetch(endpoint, options = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('accessToken');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // If the server responds with an error, try to parse the JSON for details.
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'An unexpected error occurred.');
  }

  // For DELETE requests or other responses with no content
  if (response.status === 204) {
      return null;
  }
  
  return response.json();
}

export default apiFetch;