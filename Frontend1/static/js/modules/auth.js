//
// FILE: Frontend1/static/js/modules/auth.js (Final Corrected Version)
//
import { fetchWithAuth } from '../services/apiService.js';

let state = null;
let renderApp = null;
let appInitializerCallback = null;

// --- State Initializer ---
function initializeState() {
    if (!state.auth) {
        state.auth = {
            isAuthenticated: false,
            currentView: 'login',
            error: null,
            isLoading: false,
            token: getToken()
        };
        state.auth.isAuthenticated = !!state.auth.token;
    }
}

// --- Main Component Renderer ---
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

// --- Feature Initialization ---
export function initializeAuthFeature(appState, mainRenderCallback, mainAppInitializer) {
    state = appState;
    renderApp = mainRenderCallback;
    appInitializerCallback = mainAppInitializer;
    initializeState();

    if (state.auth.isAuthenticated) {
        if (appInitializerCallback) appInitializerCallback();
    }
    
    const authContainer = document.getElementById('auth-container');
    authContainer.addEventListener('click', handleDelegatedAuthEvents);
    authContainer.addEventListener('submit', handleDelegatedAuthEvents);
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
            state.auth.error = null;
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
        const response = await fetch(`/token`, { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Login failed");

        setToken(data.access_token);
        state.auth.isAuthenticated = true;
        state.auth.token = data.access_token;
        if (appInitializerCallback) appInitializerCallback();
        renderApp();
        
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
        const newUser = await fetchWithAuth('/users/', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        alert(`User ${newUser.email} created! Please log in.`);
        state.auth.currentView = 'login';
    } catch (error) {
        state.auth.error = error.message;
    }
    state.auth.isLoading = false;
    renderApp();
}

export function logout(appState, renderCallback) {
    state = appState;
    renderApp = renderCallback;
    localStorage.removeItem('accessToken');
    state.auth.isAuthenticated = false;
    state.auth.token = null;
    // Reset other parts of the state as needed
    // e.g., state.notes = undefined;
    renderApp();
}

// --- Token Management ---
// MODIFIED: Added 'export' to make these functions available to other files
export function setToken(token) { localStorage.setItem('accessToken', token); }
export function getToken() { return localStorage.getItem('accessToken'); }