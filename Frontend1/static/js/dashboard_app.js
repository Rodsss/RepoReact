// Import the features from all modules
import { initializeNotesFeature } from './modules/notes.js';
import { initializeFlashcardsFeature } from './modules/flashcards.js';
import { initializeCollectionsFeature } from './modules/collections.js';

// ===================================================================================
//  GLOBAL STATE & CONFIG
// ===================================================================================
// All feature-specific variables have been moved to their respective modules.
const API_BASE_URL = '/api/v1';
const USER_ID = 'default-user';


// ===================================================================================
//  MAIN INITIALIZATION
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize feature modules
    initializeNotesFeature();
    initializeFlashcardsFeature();
    initializeCollectionsFeature();

    // Initialize remaining non-modularized features
    document.getElementById('translate-button').addEventListener('click', handleOnPageTranslate);
    document.getElementById('save-to-list-button').addEventListener('click', handleSaveToListClick);

    // Right Pane Tab Switching (managed globally)
    document.getElementById('show-flashcard-view').addEventListener('click', () => switchRightPaneView('flashcards'));
    document.getElementById('show-notes-view').addEventListener('click', () => switchRightPaneView('notes'));

    // Initial Page Setup
    populateTextboxFromUrl();
    fetchAndPopulateStacksDropdown();
    switchRightPaneView('flashcards'); // Set default view for right pane
});


// ===================================================================================
//  VIEW & PANE MANAGEMENT (Global)
// ===================================================================================
function switchRightPaneView(viewToShow) {
    const flashcardContainer = document.getElementById('flashcard-view-container');
    const notesContainer = document.getElementById('notes-view-container');
    const flashcardButton = document.getElementById('show-flashcard-view');
    const notesButton = document.getElementById('show-notes-view');

    flashcardButton.classList.toggle('active', viewToShow === 'flashcards');
    notesButton.classList.toggle('active', viewToShow === 'notes');
    flashcardContainer.classList.toggle('hidden', viewToShow !== 'flashcards');
    notesContainer.classList.toggle('hidden', viewToShow !== 'notes');
}


// ===================================================================================
//  TRANSLATE PANE (Last remaining feature in main file)
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
        // Consider a more modern way to refresh the list, e.g., custom events
    } catch (error) {
        console.error("Failed to save item:", error);
        alert(`Error: ${error.message}`);
    }
}

function populateTextboxFromUrl() {
    const text = new URLSearchParams(window.location.search).get('text');
    if (text) document.getElementById('translate-input').value = text;
}

async function fetchAndPopulateStacksDropdown() {
    const dropdown = document.getElementById('stack-select-dropdown');
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/stacks`);
        const stacks = await response.json();
        dropdown.innerHTML = '<option value="" disabled selected>Select a list</option>';
        stacks.forEach(s => dropdown.innerHTML += `<option value="${s.stack_id}">${s.stack_name}</option>`);
    } catch (error) {
        console.error("Error fetching stacks for dropdown:", error);
    }
}

// ===================================================================================
//  ALL OTHER FEATURES HAVE BEEN MOVED TO MODULES
// ===================================================================================