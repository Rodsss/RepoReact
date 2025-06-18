// FILE: Frontend1/static/js/modules/translate.js

// Using a mock fetch for now. In your real app, import this from apiService.js
const fetchWithAuth = async (endpoint, options) => {
    console.log("FETCHING:", endpoint, options);
    // Add mocks for any new endpoints as needed
    return Promise.resolve({ success: true, message: "Mock response" });
};

// --- Module State & Elements ---
let sourceTextBox;
let translatedTextBox;

// --- Initialization ---
export function initializeTranslateFeature() {
    sourceTextBox = document.getElementById('source-text');
    translatedTextBox = document.getElementById('translated-text');
    // Add other event listeners for this pane (like the star button) here if needed
}

// --- Core Functionality ---

/**
 * Takes text, displays it, logs it, and gets a translation.
 * @param {string} text The text collected from the extension.
 */
export async function handleIncomingText(text) {
    if (!sourceTextBox || !translatedTextBox) {
        console.error("Translate text boxes not found.");
        return;
    }

    // 1. Put the collected text in the first box
    sourceTextBox.textContent = text;
    translatedTextBox.textContent = ''; // Clear previous translation

    // 2. Log the collected text to history via the backend
    try {
        await fetchWithAuth('/history/log', {
            method: 'POST',
            body: JSON.stringify({ text: text, source_url: "From Extension" })
        });
        console.log(`Logged "${text}" to history.`);
        // Here you could trigger a refresh of the history pane if needed
    } catch (error) {
        console.error("Failed to log text to history:", error);
    }

    // 3. Call the backend for a mock translation
    translatedTextBox.textContent = 'Translating...';
    try {
        const response = await fetchWithAuth('/translation/translate', {
            method: 'POST',
            body: JSON.stringify({ text: text })
        });
        translatedTextBox.textContent = response.translated_text;
    } catch (error) {
        translatedTextBox.textContent = 'Translation failed.';
    }
}