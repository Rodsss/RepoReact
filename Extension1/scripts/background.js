import { fetchWithAuth, initializeApiClient } from '../shared/apiClient.js';

initializeApiClient({
    baseUrl: 'http://127.0.0.1:8000',
    getToken: () => null,
    logout: () => console.log("Auth error from extension."),
});

async function saveTranslationToLocalHistory(sourceText, translatedText) {
    const historyItem = { source: sourceText, translation: translatedText, timestamp: new Date().toISOString() };
    const result = await chrome.storage.local.get('translationHistory');
    const history = result.translationHistory || [];
    history.push(historyItem);
    await chrome.storage.local.set({ translationHistory: history });
    console.log("Translation saved to local extension history.");
}

// --- FINAL, ROBUST Main Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Branch for the "GET_ICON_URL" request
    if (request.type === "GET_ICON_URL") {
        const iconUrl = chrome.runtime.getURL("images/icon-16.png");
        sendResponse({ success: true, url: iconUrl });
    } 
    
    // Branch for the "API_REQUEST" (e.g., Translate)
    else if (request.type === "API_REQUEST") {
        (async () => {
            const { endpoint, options } = request.payload;
            try {
                const data = await fetchWithAuth(endpoint, options);
                if (endpoint === "/translate") {
                    const originalText = JSON.parse(options.body).text;
                    await saveTranslationToLocalHistory(originalText, data.translated_text);
                }
                sendResponse({ success: true, data: data });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
    } 
    
    // Branch for the "RAKE_TEXT" request
    else if (request.type === "RAKE_TEXT") {
        (async () => {
            const { selectedText } = request.data || {};
            if (!selectedText) {
                sendResponse({ success: false, error: "No text provided." });
                return;
            }
            const webAppUrl = "http://127.0.0.1:8000/";
            const urlWithText = `${webAppUrl}?text=${encodeURIComponent(selectedText)}`;
            
            const tabs = await chrome.tabs.query({ url: `${webAppUrl}*` });
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: urlWithText, active: true });
                await chrome.windows.update(tabs[0].windowId, { focused: true });
            } else {
                await chrome.tabs.create({ url: urlWithText });
            }
            sendResponse({ success: true, message: "Tab action completed." });
        })();
    }
    
    // Return true to indicate that one of the asynchronous branches will send a response.
    // This is crucial for keeping the message channel open.
    return true;
});