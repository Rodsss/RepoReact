/**
 * =============================================================================
 * dashboard_app.js
 * * Main application controller for the dashboard.
 * This script initializes all feature modules and manages shared state and rendering.
 * =============================================================================
 */

// --- 1. Module Imports ---
// Import the public methods from each feature module.
import CollectionsModule from './modules/collections.js';
import { initializeNotesFeature, renderNotes } from './modules/notes.js';
import { initializeMediaSearchFeature, renderMediaSearch } from './modules/media_search.js';


// --- 2. Global State Management ---
// Central state object passed to modules that need to share state.
// 'collections.js' is self-contained, but 'notes' and 'media_search' are managed here.
const appState = {
    // Let the notes module create the 'notes' property itself.
    mediaSearch: {
        searchStatus: 'idle',
        mediaSearchResults: []
    }
};

/**
 * Main render function. Called whenever state changes in a managed module.
 * It invokes the specific render functions for each module.
 */
function renderApp() {
    renderNotes(); 
    renderMediaSearch();
}


// --- 3. Main Application Initializer ---
// Waits for the HTML document to be fully loaded before running any scripts.
document.addEventListener('DOMContentLoaded', () => {

  console.log("Dashboard initializing...");

  // --- Initialize Feature Modules ---
  
  // Pane 2: Initialize the Collections feature.
  CollectionsModule.init();
  console.log("Collections module initialized.");

  // Pane 3, Tab 1: Initialize the Notes feature.
  initializeNotesFeature(appState, renderApp);
  console.log("Notes module initialized.");
  
  // Pane 3, Tab 2: Initialize the Media Search (Watch) feature.
  initializeMediaSearchFeature(appState, renderApp);
  console.log("Media Search module initialized.");


  // --- UI Controllers ---

  // Controller for Pane 3 Tab Navigation (Notes & Watch).
  // This generic controller handles switching between any number of tabs in Pane 3.
  const pane3 = document.getElementById('pane-three');
  if (pane3) {
    pane3.addEventListener('click', (event) => {
      const targetButton = event.target.closest('.pane-nav-button');
      
      // If the click wasn't on a tab button, do nothing.
      if (!targetButton) return;

      // Get all tab buttons and content panels within Pane 3.
      const allNavButtons = pane3.querySelectorAll('.pane-nav-button');
      const allContentPanels = pane3.querySelectorAll('.pane-nav-content');
      
      // Deactivate all tabs and panels.
      allNavButtons.forEach(btn => btn.classList.remove('active'));
      allContentPanels.forEach(panel => panel.classList.remove('active'));

      // Activate the clicked button and its corresponding content panel.
      targetButton.classList.add('active');
      const targetId = targetButton.dataset.target;
      const targetPanel = pane3.querySelector(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  }

  console.log("Dashboard initialization complete.");
});