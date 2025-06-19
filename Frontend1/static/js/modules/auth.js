//
// FILE: Frontend1/static/js/modules/auth.js (Final Consolidated Version)
//
import { fetchWithAuth } from '../services/apiService.js';

let state = null;
let renderApp = null;
let appInitializerCallback = null; // To initialize other features after login

// --- State Initializer ---
function initializeState() {
    if (!state.auth) {
        state.auth = {
            isAuthenticated: false,
            currentView: 'login', // or 'register'
            error: null,
            isLoading: false,
            token: getToken() // Load token from localStorage initially
        };
        state.auth.isAuthenticated = !!state.auth.token;
    }
}

// --- Main Component Renderer ---
// Renders the entire authentication view (either login or register form)
export function AuthComponent() {
    const { currentView, error, isLoading } = state.auth;
    const errorHtml = error ? `<p class="error-message">${error}</p>` : '';
    const loadingClass = isLoading ? 'is-loading' : '';

    const loginView = `
        <div id="login-container" class="${currentView === 'login' ? '' : 'hidden'}">
            <h2>Login</h2>
            <form id="login-form">
                ${errorHtml}
                <input type="email" id="login-email" placeholder="Email" required />
                <input type="password" id="login-password" placeholder="Password" required />
                <button type="submit" class="btn-base" ${isLoading ? 'disabled' : ''}>${isLoading ? 'Logging in...' : 'Login'}</button>
            </form>
            <a href="#" data-action="show-register">Need an account? Register</a>
        </div>
    `;

    const registerView = `
        <div id="register-container" class="${currentView === 'register' ? '' : 'hidden'}">
            <h2>Register</h2>
            <form id="register-form">
                ${errorHtml}
                <input type="email" id="register-email" placeholder="Email" required />
                <input type="password" id="register-password" placeholder="Password" required />
                <button type="submit" class="btn-base" ${isLoading ? 'disabled' : ''}>${isLoading ? 'Registering...' : 'Register'}</button>
            </form>
            <a href="#" data-action="show-login">Already have an account? Login</a>
        </div>
    `;
    
    return `<div id="auth-view-container" class="${loadingClass}">${loginView}${registerView}</div>`;
}


// --- Event Handling and State Changes ---

export function initializeAuth(appInitializer) {
    // This function is the entry point, but in a fully state-driven app,
    // the main dashboard_app.js would handle initialization and state.
    // We keep this structure for now.
    appInitializerCallback = appInitializer;
}

export function initializeAuthFeature(appState, mainRenderCallback) {
    state = appState;
    renderApp = mainRenderCallback;
    initializeState();

    // Check initial auth state when the app loads
    if (state.auth.isAuthenticated) {
        if (appInitializerCallback) appInitializerCallback();
    }
    
    // Add a single delegated event listener to the auth container
    document.getElementById('auth-container').addEventListener('click', handleDelegatedAuthEvents);
    document.getElementById('auth-container').addEventListener('submit', handleDelegatedAuthEvents);
}

// --- Delegated Event Handler ---
async function handleDelegatedAuthEvents(event) {
    const action = event.target.dataset.action;

    if (event.type === 'submit') {
        event.preventDefault();
        if (event.target.id === 'login-form') await handleLogin();
        if (event.target.id === 'register-form') await handleRegister();
    }

    if (event.type === 'click') {
        if (action === 'show-register' || action === 'show-login') {
            event.preventDefault();
            state.auth.currentView = action === 'show-register' ? 'register' : 'login';
            state.auth.error = null; // Clear error on view switch
            renderApp();
        }
    }
}


// --- Actions ---

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    state.auth.isLoading = true;
    state.auth.error = null;
    renderApp();

    try {
        // This endpoint is special and doesn't use fetchWithAuth's Bearer token,
        // so a direct fetch is acceptable here, but we've improved state handling.
        const response = await fetch(`/token`, { method: 'POST', body: formData });
        const data = await response.json();

        if (!response.ok) throw new Error(data.detail || "Login failed");

        setToken(data.access_token);
        state.auth.isAuthenticated = true;
        state.auth.token = data.access_token;
        if (appInitializerCallback) appInitializerCallback();
        renderApp(); // This will now trigger the main app to show the dashboard
        
    } catch (error) {
        state.auth.error = error.message;
        state.auth.isAuthenticated = false;
    }
    state.auth.isLoading = false;
    renderApp();
}

async function handleRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    state.auth.isLoading = true;
    state.auth.error = null;
    renderApp();

    try {
        // Use fetchWithAuth for consistency, even on public endpoints
        const newUser = await fetchWithAuth('/users/', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        alert(`User ${newUser.email} created! Please log in.`);
        state.auth.currentView = 'login'; // Switch to login view
    } catch (error) {
        state.auth.error = error.message;
    }
    state.auth.isLoading = false;
    renderApp();
}

export function logout() {
    localStorage.removeItem('accessToken');
    // In a state-driven app, you reset the state instead of reloading
    state.auth.isAuthenticated = false;
    state.auth.token = null;
    // Potentially reset other state slices as well
    // state.notes = null; state.collections = null; etc.
    renderApp();
    // No window.location.reload(); needed
}

// --- Token Management ---
function setToken(token) { localStorage.setItem('accessToken', token); }
function getToken() { return localStorage.getItem('accessToken'); }