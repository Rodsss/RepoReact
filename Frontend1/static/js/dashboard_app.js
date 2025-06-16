//
// FILE: Frontend1/static/js/dashboard_app.js (Fully Refactored & Consolidated)
//

// --- IMPORTS: Import INITIALIZER and RENDERER from all feature modules ---
import { initializeNotesFeature, renderNotes } from './modules/notes.js';
import { initializeFlashcardsFeature, renderFlashcards } from './modules/flashcards.js';
import { initializeCollectionsFeature, renderCollections } from './modules/collections.js';
import { initializeMediaSearchFeature, renderMediaSearch } from './modules/media_search.js';

// --- GLOBAL STATE & CONFIG ---
const API_BASE_URL = '/api/v1';

const appState = {
    userId: 'default-user',
    // Each module will create and manage its own sub-state inside this object.
    // e.g., state.notes = {...}, state.collections = {...}
};

// --- MAIN RENDER FUNCTION ---
/**
 * The single function that redraws the entire UI based on the current appState.
 * It calls the specific render function from each module.
 */
function render() {
    console.log("App state changed. Re-rendering UI...");
    renderNotes(appState);
    renderFlashcards(appState);
    renderCollections(appState);
    renderMediaSearch(appState);
}

// --- MAIN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all feature modules, passing them the state and the main render function
    initializeNotesFeature(appState, render);
    initializeFlashcardsFeature(appState, render);
    initializeCollectionsFeature(appState, render);
    initializeMediaSearchFeature(appState, render);

    // Initialize event listeners for any remaining non-modularized features
    const translateButton = document.getElementById('translate-button');
    if (translateButton) {
        translateButton.addEventListener('click', handleOnPageTranslate);
    }
    
    const saveToListButton = document.getElementById('save-to-list-button');
    if(saveToListButton) {
        saveToListButton.addEventListener('click', handleSaveToListClick);
    }

    // Set up event listeners for the main right-pane tab switching
    document.getElementById('show-flashcard-view').addEventListener('click', () => switchRightPaneView('flashcards'));
    document.getElementById('show-notes-view').addEventListener('click', () => switchRightPaneView('notes'));
    document.getElementById('show-media-search-view').addEventListener('click', () => switchRightPaneView('media'));

    // Initial Page Setup
    populateTextboxFromUrl();
    fetchAndPopulateStacksDropdown(); // This function still manually manipulates the DOM for the translate pane
    switchRightPaneView('flashcards'); // Set the default view
});


// === LEGACY & GLOBAL FUNCTIONS ===
// These functions are still needed for parts of the UI we haven't refactored yet,
// or for global actions like switching panes.

function switchRightPaneView(viewToShow) {
    const dashboardContainer = document.querySelector('.dashboard-container');
    const flashcardContainer = document.getElementById('flashcard-view-container');
    const notesContainer = document.getElementById('notes-view-container');
    const mediaContainer = document.getElementById('media-search-view-container');
    const flashcardButton = document.getElementById('show-flashcard-view');
    const notesButton = document.getElementById('show-notes-view');
    const mediaButton = document.getElementById('show-media-search-view');

    if (dashboardContainer) {
        dashboardContainer.classList.toggle('discover-mode-active', viewToShow === 'media');
    }

    if (flashcardButton) flashcardButton.classList.toggle('active', viewToShow === 'flashcards');
    if (notesButton) notesButton.classList.toggle('active', viewToShow === 'notes');
    if (mediaButton) mediaButton.classList.toggle('active', viewToShow === 'media');

    if (flashcardContainer) flashcardContainer.classList.toggle('hidden', viewToShow !== 'flashcards');
    if (notesContainer) notesContainer.classList.toggle('hidden', viewToShow !== 'notes');
    if (mediaContainer) mediaContainer.classList.toggle('hidden', viewToShow !== 'media');
}

async function handleOnPageTranslate() {
    const input = document.getElementById('translate-input');
    const output = document.getElementById('translate-output');
    if (!input.value.trim()) return;
    output.value = "Translating...";
    try {
        const response = await fetch(`${API_BASE_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input.value.trim() })
        });
        if (!response.ok) throw new Error("Translation failed");
        const result = await response.json();
        output.value = result.translated_text;
    } catch (error) {
        output.value = "Error during translation.";
        console.error("Translation error:", error);
    }
}

async function handleSaveToListClick() {
    const textInput = document.getElementById('translate-input');
    const selectedStackId = document.getElementById('stack-select-dropdown').value;
    if (!textInput.value.trim()) return alert("Textbox is empty.");
    if (!selectedStackId) return alert("Please select a list.");

    try {
        const response = await fetch(`${API_BASE_URL}/stacks/${selectedStackId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textInput.value.trim(), sourceUrl: window.location.href, pageTitle: document.title })
        });
        if (!response.ok) throw new Error((await response.json()).detail);
        alert("Item saved successfully!");
        textInput.value = '';
    } catch (error) {
        console.error("Failed to save item:", error);
        alert(`Error: ${error.message}`);
    }
}

function populateTextboxFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const text = params.get('text');
    if (text) {
        const translateInput = document.getElementById('translate-input');
        if (translateInput) translateInput.value = text;
    }
}

async function fetchAndPopulateStacksDropdown() {
    const dropdown = document.getElementById('stack-select-dropdown');
    if (!dropdown) return;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${appState.userId}/stacks`);
        const stacks = await response.json();
        
        // This function still manually updates the DOM, but that's okay for now.
        appState.collections.stacks = stacks; // Also update state
        
        dropdown.innerHTML = '<option value="" disabled selected>Select a list</option>';
        stacks.forEach(s => {
            dropdown.innerHTML += `<option value="${s.stack_id}">${s.stack_name}</option>`;
        });
    } catch (error) {
        console.error("Error fetching stacks for dropdown:", error);
    }
}