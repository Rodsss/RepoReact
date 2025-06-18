// scripts/background.js

// This runs once when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
    console.log("1Project extension installed/updated successfully.");
});

// --- MOCK/PLACEHOLDER FOR GOOGLE TRANSLATE API ---
async function getGoogleTranslation(textToTranslate, targetLang = 'en') {
    console.warn("1Project Background: Using MOCK Google Translation API.");
    // This returns a predictable, hardcoded "translation" for testing.
    return Promise.resolve({
        translatedText: `[MOCK Translated: ${textToTranslate}]`,
        detectedSourceLanguage: 'mock-auto',
    });
}

// --- HELPER FUNCTIONS TO TALK TO YOUR BACKEND ---

// Logs a translation event to your FastAPI backend.
async function logTranslationToOurApi(originalText, translatedText, sourceLang, targetLang, sourceUrl) {
    const endpointUrl = 'http://127.0.0.1:8000/api/v1/translation_logs';
    const payload = { 
        originalText, 
        translatedText, 
        sourceLanguage: sourceLang, 
        targetLanguage: targetLang, 
        sourceUrl, 
        timestamp: new Date().toISOString() 
    };
    console.log("1Project Background: Logging translation to our API:", payload);
    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            console.warn(`Failed to log translation. Status: ${response.status}`);
        } else {
            console.log("Translation logged successfully to our API.");
        }
    } catch (error) {
        console.error("Network error while logging translation:", error);
    }
}

// Collects a text snippet to your FastAPI backend.
async function collectSnippetToOurApi(selectedText, sourceUrl, pageTitle) {
    const endpointUrl = 'http://127.0.0.1:8000/api/v1/snippets';
    const payload = { 
        selectedText, 
        sourceUrl, 
        pageTitle, 
        timestamp: new Date().toISOString() 
    };
    console.log("1Project Background: Sending snippet to our API:", payload);
    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            console.warn(`Failed to collect snippet. Status: ${response.status}`);
            return { success: false, message: "Failed to collect snippet." };
        } else {
            console.log("Snippet collected successfully to our API.");
            return { success: true, message: "Snippet collected." };
        }
    } catch (error) {
        console.error("Network error collecting snippet:", error);
        return { success: false, message: "Network error collecting snippet." };
    }
}


// --- MAIN MESSAGE LISTENER FROM CONTENT SCRIPT ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("1Project Background: Message received - Type:", request.type);

    if (!request || !request.type) {
        console.error("1Project Background: Invalid request received.");
        return false;
    }

    // --- HANDLER FOR THE "TRANSLATE" ACTION ---
    if (request.type === "TRANSLATE_TEXT") {
        const { selectedText, sourceUrl } = request.data || {};
        if (!selectedText) {
            sendResponse({ status: 'error', message: "No text provided." });
            return false;
        }

        // Action 1: Open the web app page with the text in the URL.
        const webAppUrl = "http://127.0.0.1:8000/translate";
        const urlWithText = `${webAppUrl}?text=${encodeURIComponent(selectedText)}`;
        console.log("1Project Background: Constructing URL to open:", urlWithText);
        chrome.tabs.query({ url: webAppUrl }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { url: urlWithText, active: true });
            } else {
                chrome.tabs.create({ url: urlWithText });
            }
        });

        // Action 2: In parallel, perform the mock translation and log it.
        getGoogleTranslation(selectedText, 'en')
            .then(mockResult => {
                logTranslationToOurApi(
                    selectedText,
                    mockResult.translatedText,
                    mockResult.detectedSourceLanguage,
                    'en',
                    sourceUrl
                );
                // Send the result back to the content script.
                sendResponse({
                    status: 'success_translation',
                    translatedText: mockResult.translatedText
                });
            })
            .catch(error => {
                console.error("Error in translation chain:", error);
                sendResponse({ status: 'error', message: "Translation failed." });
            });
            
        return true; // Indicates an asynchronous response.
    
    // --- HANDLER FOR THE "COLLECT SNIPPET" ACTION (Corrected) ---
    } else if (request.type === "COLLECT_SNIPPET") {
        const { selectedText, sourceUrl, pageTitle } = request.data || {};
        if (!selectedText) {
            sendResponse({ success: false, message: "No text provided." });
            return false; // Return early if no text
        }

        const webAppUrl = "http://127.0.0.1:8000/";
        collectSnippetToOurApi(selectedText, sourceUrl, pageTitle);

        chrome.tabs.query({ url: `${webAppUrl}*` }, (tabs) => {
            if (tabs.length > 0) {
                const appTab = tabs[0];
                chrome.tabs.sendMessage(appTab.id, { type: "NEW_TEXT_COLLECTED", text: selectedText });
                chrome.tabs.update(appTab.id, { active: true });
                chrome.windows.update(appTab.windowId, { focused: true });
                sendResponse({ success: true, message: "Snippet sent to app." });
            } else {
                const urlWithText = `${webAppUrl}?text=${encodeURIComponent(selectedText)}`;
                chrome.tabs.create({ url: urlWithText });
                sendResponse({ success: true, message: "App opened with snippet." });
            }
        });

        // **THIS IS THE CRITICAL FIX:** Return true to indicate that you will
        // respond asynchronously from within the chrome.tabs.query callback.
        return true;
    }
});