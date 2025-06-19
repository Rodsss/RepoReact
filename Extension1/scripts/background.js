// ==================================================================
//               SECTION 1: NEW CODE TO BE ADDED AT THE TOP
// ==================================================================
// IMPORTANT: You must import the shared library in Manifest V3.
// In your manifest.json, ensure the background script is set to be a module:
// "background": {
//   "service_worker": "scripts/background.js",
//   "type": "module"
// }
import { fetchWithAuth, initializeApiClient } from "./shared/apiClient.js";

// Initialize the shared API client. For the public translate endpoint,
// we don't need to provide a real token or logout function.
// For more secure endpoints, a more complex token-sharing mechanism
// would be needed in the future.
initializeApiClient({
  getToken: () => null,
  logout: () => console.log("Auth error from extension."),
});

// ==================================================================
//          SECTION 2: EXISTING CODE THAT REMAINS UNCHANGED
// ==================================================================
chrome.runtime.onInstalled.addListener(() => {
  console.log("1Project extension installed/updated successfully.");
});

// --- MAIN MESSAGE LISTENER (with one new handler added) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Make the listener async to handle async operations
  (async () => {
    if (!request || !request.type) {
      return;
    }

    // ==================================================================
    //          SECTION 3: NEW HANDLER FOR API_REQUEST
    // ==================================================================
    // This new "if" block handles API calls delegated from content scripts.
    if (request.type === "API_REQUEST") {
      const { endpoint, options } = request.payload;
      try {
        const data = await fetchWithAuth(endpoint, options);
        sendResponse({ success: true, data: data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return;
    }

    // ==================================================================
    //      SECTION 4: EXISTING HANDLERS THAT REMAIN UNCHANGED
    // ==================================================================
    // This handler for getting the Icon URL is unchanged.
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

    // This handler for collecting text is unchanged.
    if (request.type === "COLLECT_TEXT") {
      const { selectedText, shouldOpenTab } = request.data || {};
      if (!selectedText) return;

      const webAppUrl = "http://127.0.0.1:8000/";

      chrome.tabs.query({ url: `${webAppUrl}*` }, (tabs) => {
        if (tabs.length > 0) {
          const appTab = tabs[0];
          chrome.tabs.sendMessage(appTab.id, {
            type: "TEXT_COLLECTED",
            text: selectedText,
          });

          if (shouldOpenTab) {
            chrome.tabs.update(appTab.id, { active: true });
            chrome.windows.update(appTab.windowId, { focused: true });
          }
        } else {
          if (shouldOpenTab) {
            const urlWithText = `${webAppUrl}?text=${encodeURIComponent(selectedText)}`;
            chrome.tabs.create({ url: urlWithText });
          }
        }
      });
      return;
    }
  })();

  // Return true to indicate you will send a response asynchronously.
  return true;
});
