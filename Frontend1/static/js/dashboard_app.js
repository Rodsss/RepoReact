// ===================================================================================
//  IMPORTS
// ===================================================================================
import { initializeNotesFeature } from './modules/notes.js';
import { initializeFlashcardsFeature } from './modules/flashcards.js';
import { initializeCollectionsFeature } from './modules/collections.js';
import { initializeMediaSearchFeature } from './modules/media_search.js';

// ===================================================================================
//  GLOBAL STATE & CONFIG
// ===================================================================================
const API_BASE_URL = '/api/v1';

/**
 * A central object to hold the application's shared state.
 */
const appState = {
    userId: 'default-user',
    collections: [],
    currentNotes: [],
    mediaSearchResults: []
};

// ===================================================================================
//  MAIN INITIALIZATION
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL FIX: Pass the appState object to each module upon initialization
    initializeNotesFeature(appState);
    initializeFlashcardsFeature(appState);
    initializeCollectionsFeature(appState);
    initializeMediaSearchFeature(appState);

    // Initialize event listeners for non-modularized features
    document.getElementById('translate-button').addEventListener('click', handleOnPageTranslate);
    document.getElementById('save-to-list-button').addEventListener('click', handleSaveToListClick);

    // Set up event listeners for right-pane tab switching
    document.getElementById('show-flashcard-view').addEventListener('click', () => switchRightPaneView('flashcards'));
    document.getElementById('show-notes-view').addEventListener('click', () => switchRightPaneView('notes'));
    document.getElementById('show-media-search-view').addEventListener('click', () => switchRightPaneView('media'));

    // Initial Page Setup
    populateTextboxFromUrl();
    fetchAndPopulateStacksDropdown();
    switchRightPaneView('flashcards');
});


// ===================================================================================
//  VIEW & PANE MANAGEMENT (Global)
// ===================================================================================
/**
 * Manages the visibility of content panes on the right side of the dashboard.
 * @param {'flashcards' | 'notes' | 'media'} viewToShow The view to make visible.
 */
function switchRightPaneView(viewToShow) {
    const flashcardContainer = document.getElementById('flashcard-view-container');
    const notesContainer = document.getElementById('notes-view-container');
    const mediaContainer = document.getElementById('media-search-view-container');

    const flashcardButton = document.getElementById('show-flashcard-view');
    const notesButton = document.getElementById('show-notes-view');
    const mediaButton = document.getElementById('show-media-search-view');

    // Toggle 'active' class on buttons based on the selected view
    flashcardButton.classList.toggle('active', viewToShow === 'flashcards');
    notesButton.classList.toggle('active', viewToShow === 'notes');
    mediaButton.classList.toggle('active', viewToShow === 'media');

    // Toggle 'hidden' class on content containers
    flashcardContainer.classList.toggle('hidden', viewToShow !== 'flashcards');
    notesContainer.classList.toggle('hidden', viewToShow !== 'notes');
    mediaContainer.classList.toggle('hidden', viewToShow !== 'media');
}


// ===================================================================================
//  TRANSLATE PANE
// ===================================================================================
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
    const text = new URLSearchParams(window.location.search).get('text');
    if (text) document.getElementById('translate-input').value = text;
}

/**
 * Fetches the user's collections/stacks from the API, updates the global state,
 * and populates the dropdown menu in the Translate pane.
 */
async function fetchAndPopulateStacksDropdown() {
    const dropdown = document.getElementById('stack-select-dropdown');
    try {
        const response = await fetch(`${API_BASE_URL}/users/${appState.userId}/stacks`);
        const stacks = await response.json();
        appState.collections = stacks;
        dropdown.innerHTML = '<option value="" disabled selected>Select a list</option>';
        appState.collections.forEach(s => {
            dropdown.innerHTML += `<option value="${s.stack_id}">${s.stack_name}</option>`;
        });
    } catch (error) {
        console.error("Error fetching stacks for dropdown:", error);
    }
}