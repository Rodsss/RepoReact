import { fetchWithAuth } from '../services/apiService.js';

let appInitializerCallback = null;
const authContainer = document.getElementById('auth-container');
const mainAppContainer = document.getElementById('main-app-container');
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');

// --- Event Handlers ---
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const data = await fetch(`/token`, {
            method: 'POST',
            body: formData,
        }).then(res => res.json());

        if (data.access_token) {
            setToken(data.access_token);
            showDashboard();
            if (appInitializerCallback) appInitializerCallback();
        } else {
            alert(data.detail || "Login failed");
        }
    } catch (error) {
        alert('Login failed. Please try again.');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        const response = await fetch(`/users/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        const newUser = await response.json();
        if (!response.ok) throw new Error(newUser.detail || 'Registration failed');
        alert(`User ${newUser.email} created successfully! Please log in.`);
        showLoginForm(new Event('click'));
    } catch (error) {
        alert(`Registration failed: ${error.message}`);
    }
}

export function logout() {
    localStorage.removeItem('accessToken');
    showLogin();
    // Optionally, reload the page to reset the app state
    window.location.reload();
}

// --- UI Toggling ---
function showRegisterForm(e) {
    e.preventDefault();
    loginContainer.classList.add('hidden');
    registerContainer.classList.remove('hidden');
}

function showLoginForm(e) {
    e.preventDefault();
    registerContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
}

function showDashboard() {
    authContainer.classList.add('hidden');
    mainAppContainer.classList.remove('hidden');
}

function showLogin() {
    mainAppContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
}

// --- Token Management ---
export function setToken(token) { localStorage.setItem('accessToken', token); }
export function getToken() { return localStorage.getItem('accessToken'); }

// --- Initialization ---
function checkInitialAuthState() {
    if (getToken()) {
        showDashboard();
        if (appInitializerCallback) appInitializerCallback();
    } else {
        showLogin();
    }
}

export function initializeAuth(appInitializer) {
    appInitializerCallback = appInitializer;
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('show-register').addEventListener('click', showRegisterForm);
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    checkInitialAuthState();
}