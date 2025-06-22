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


// --- 2. Global State Management ---
const appState = {
    mediaSearch: {
        searchStatus: 'idle',
        mediaSearchResults: []
    }
};

function renderApp() {
    renderNotes(); 
    renderMediaSearch();
}


// --- 3. Main Application Initializer ---
document.addEventListener('DOMContentLoaded', () => {

  console.log("Dashboard initializing...");

  // --- Initialize Feature Modules ---
  TranslateModule.init();
  CollectionsModule.init();
  initializeNotesFeature(appState, renderApp);
  initializeMediaSearchFeature(appState, renderApp);
  console.log("All modules initialized.");

  // --- Inter-Module Communication (Event Listeners) ---

  // Listen for a request from the Translate module to show the "Save to list" modal
  document.addEventListener('requestListsForModal', (event) => {
      const { text } = event.detail;
      const allLists = CollectionsModule.getLists(); // Get lists from the Collections module
      TranslateModule.renderModalLists(allLists, text); // Ask Translate module to render the modal
  });

  // Listen for a request from the Translate module to save a word
  document.addEventListener('saveWordToList', (event) => {
      const { text, list } = event.detail;
      const success = CollectionsModule.addWordToList(text, list); // Ask Collections module to save the word
      if (success) {
          console.log(`Saved "${text}" to "${list}"`);
          // You could add a more sophisticated notification here if desired
      }
  });

  // Listen for when a word is clicked in the Collections pane
  document.addEventListener('wordSelected', (event) => {
      const { text } = event.detail;
      TranslateModule.setText(text); // Set the text in the main translation text area
  });

  // --- UI Controllers ---
  const pane3 = document.getElementById('pane-three');
  if (pane3) {
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