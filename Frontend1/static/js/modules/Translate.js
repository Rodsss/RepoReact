//
// FILE: Frontend1/static/js/modules/Translate.js (Final Consolidated Version)
//
import { fetchWithAuth } from "../services/apiService.js"; // <-- Use the real API service

let state = null;
let renderApp = null;

// --- State Initializer ---
function initializeState() {
  if (!state.translation) {
    state.translation = {
      sourceText: "",
      translatedText: "",
      isLoading: false,
      logSuccess: null, // Can be true, false, or null
    };
  }
}

// --- Main Component Renderer ---
// Renders the part of the UI managed by this module based on the central state.
export function TranslateComponent() {
  const { sourceText, translatedText, isLoading } = state.translation;
  const translationContent = isLoading
    ? "Translating..."
    : translatedText || "...";

  // This returns the inner HTML for the text boxes, which the main render function will place.
  // Note: We assume the text boxes exist in the main HTML. This component just provides their content.
  const sourceTextBox = document.getElementById("source-text");
  const translatedTextBox = document.getElementById("translated-text");

  if (sourceTextBox) {
    sourceTextBox.textContent = sourceText;
  }
  if (translatedTextBox) {
    translatedTextBox.textContent = translationContent;
  }

  // This component doesn't return HTML because it directly updates existing elements.
  // For a full component-based system, you might return the full div structure.
}

// --- Event Handling and State Changes ---

export function initializeTranslateFeature(appState, mainRenderCallback) {
  state = appState;
  renderApp = mainRenderCallback;
  initializeState();

  // In the new design, event listeners for actions like "log" or "translate"
  // would be handled by a delegated event listener in the main app,
  // or attached here if specific to this view.
  // For now, functionality is kicked off by handleIncomingText.
}

// --- Core Functionality (Actions) ---

/**
 * Handles text coming from the extension. It updates the state and then
 * triggers the logging and translation actions.
 * @param {string} text The text collected from the extension.
 */
export async function handleIncomingText(text) {
  if (!state) return;

  // 1. Update state with the new source text and clear old translation
  state.translation.sourceText = text;
  state.translation.translatedText = "";
  state.translation.logSuccess = null;
  renderApp(); // Render the new source text immediately

  // 2. Trigger the async operations
  await logTextToHistory(text);
  await translateText(text);
}

/**
 * Logs the given text to the user's history via the backend.
 * @param {string} text The text to log.
 */
async function logTextToHistory(text) {
  try {
    await fetchWithAuth("/history/log", {
      method: "POST",
      body: JSON.stringify({ text: text, source_url: "From Extension" }),
    });
    state.translation.logSuccess = true;
    console.log(`Logged "${text}" to history.`);
    // You could add logic here to refresh a history view if one exists
  } catch (error) {
    state.translation.logSuccess = false;
    console.error("Failed to log text to history:", error);
  }
  // No renderApp() call here, to avoid unnecessary re-renders.
  // The main translation action will trigger the final render.
}

/**
 * Fetches the translation for the given text from the backend.
 * @param {string} text The text to translate.
 */
async function translateText(text) {
  state.translation.isLoading = true;
  renderApp(); // Show "Translating..." message

  try {
    const response = await fetchWithAuth("/translation/translate", {
      method: "POST",
      body: JSON.stringify({ text: text }),
    });
    state.translation.translatedText = response.translated_text;
  } catch (error) {
    state.translation.translatedText = "Translation failed.";
  }

  state.translation.isLoading = false;
  renderApp(); // Render the final translated text or error
}
