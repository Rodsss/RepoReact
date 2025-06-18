import { initializeAuth } from './modules/auth.js';
// We no longer need to import all the other modules here

function initializeApp() {
    console.log("User is logged in. Main application can now be initialized.");
    // In the future, the functions to start the notes, collections, etc.
    // would be called from here. For now, this confirms login works.
    
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(initializeApp);
});