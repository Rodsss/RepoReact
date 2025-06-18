// FILE: Extension1/scripts/background.js (Final Version)

chrome.runtime.onInstalled.addListener(() => {
    console.log("1Project extension installed/updated successfully.");
});

// --- MAIN MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || !request.type) {
        return; 
    }

    // --- Handler for getting the Icon URL ---
    if (request.type === "GET_ICON_URL") {
        try {
            const iconUrl = chrome.runtime.getURL("images/icon-16.png");
            sendResponse({ success: true, url: iconUrl });
        } catch (e) {
            console.error("Error getting icon URL:", e);
            sendResponse({ success: false });
        }
        return;
    }
    
    // --- Handler for the "Collect" Action ---
    if (request.type === "COLLECT_TEXT") { 
        const { selectedText } = request.data || {};
        if (!selectedText) return;

        const webAppUrl = "http://127.0.0.1:8000/";
        
        // This logic finds your app tab or creates a new one
        chrome.tabs.query({ url: `${webAppUrl}*` }, (tabs) => {
            if (tabs.length > 0) {
                // If the tab is found, focus it and send the text to it.
                const appTab = tabs[0];
                chrome.tabs.sendMessage(appTab.id, { type: "TEXT_COLLECTED", text: selectedText });
                chrome.tabs.update(appTab.id, { active: true });
                chrome.windows.update(appTab.windowId, { focused: true });
            } else {
                // If the app is not open, open a new tab with the text.
                const urlWithText = `${webAppUrl}?text=${encodeURIComponent(selectedText)}`;
                chrome.tabs.create({ url: urlWithText });
            }
        });
    }
});