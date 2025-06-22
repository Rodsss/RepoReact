/**
 * =============================================================================
 * dashboard_app.js
 * * Main application controller for the dashboard.
 * Initializes all feature modules and handles communication between them.
 * =============================================================================
 */

// --- 1. Module Imports ---
import TranslateModule from './modules/translate.js';
import CollectionsModule from './modules/collections.js';
import { initializeNotesFeature, renderNotes } from './modules/notes.js';
import { initializeMediaSearchFeature, renderMediaSearch } from './modules/media_search.js';
import { initializeFlashcardsFeature, renderFlashcards } from './modules/flashcards.js';
import { initializeConnectFeature, renderConnect } from './modules/connect.js';
import { initializeReadFeature, renderRead } from './modules/read.js';

// --- 2. Global State & Render ---
const appState = {
    userId: 1,
    mediaSearch: {
        searchStatus: 'idle',
        mediaSearchResults: []
    },
};

/**
 * Main render function. Called whenever state changes in a managed module.
 */
function renderApp() {
    renderNotes();
    renderMediaSearch();
    renderFlashcards();
    renderConnect();
    renderRead();
}

// --- 3. Main Application Initializer & Event Wiring ---
document.addEventListener('DOMContentLoaded', () => {

    console.log("Dashboard initializing...");

    // Initialize All Feature Modules
    TranslateModule.init();
    CollectionsModule.init();
    initializeNotesFeature(appState, renderApp);
    initializeMediaSearchFeature(appState, renderApp);
    initializeFlashcardsFeature(appState, renderApp);
    initializeConnectFeature(appState, renderApp); // Initialize new module
    initializeReadFeature(appState, renderApp);   // Initialize new module
    console.log("All modules initialized.");

    // --- Inter-Module Communication (Event Listeners) ---
    // (Your existing event listeners for translate/collections go here)
    document.addEventListener('requestListsForModal', (event) => {
        const { text } = event.detail;
        const allLists = CollectionsModule.getLists();
        TranslateModule.renderModalLists(allLists, text);
    });
    document.addEventListener('saveWordToList', (event) => {
        const { text, list } = event.detail;
        CollectionsModule.addWordToList(text, list);
    });
    document.addEventListener('wordSelected', (event) => {
        const { text } = event.detail;
        TranslateModule.setText(text);
    });

    // --- UI Controllers ---
    const pane3 = document.getElementById('pane-three');
    if (pane3) {
        // This generic tab controller will automatically handle the new tabs
        pane3.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.pane-nav-button');
            if (!targetButton) return;
            const allNavButtons = pane3.querySelectorAll('.pane-nav-button');
            const allContentPanels = pane3.querySelectorAll('.pane-nav-content');
            allNavButtons.forEach(btn => btn.classList.remove('active'));
            allContentPanels.forEach(panel => panel.classList.remove('active'));
            targetButton.classList.add('active');
            const targetId = targetButton.dataset.target;
            const targetPanel = pane3.querySelector(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    }

    console.log("Dashboard initialization complete. Event listeners are active.");
});