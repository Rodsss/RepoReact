// scripts/background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("1Project extension installed/updated successfully.");
  // Context menu setup can be added here later if needed,
  // remember to add "contextMenus" to manifest.json permissions.
});

// --- Mock/Placeholder for Google Translate API ---
async function getGoogleTranslation(textToTranslate, targetLang = 'en') {
    console.warn("1Project Background: Using MOCK Google Translation API.");
    // Simulate an API call delay (optional, for realism during testing)
    // await new Promise(resolve => setTimeout(resolve, 100)); 
    
    // Return a predictable, hardcoded "translation"
    return Promise.resolve({
        translatedText: `[MOCK Translated: ${textToTranslate}]`,
        detectedSourceLanguage: 'mock-auto', // Mocked source language
        // originalText: textToTranslate // Not needed to return, background already has it
    });
}

// Helper function to log translation to your website's API (local backend)
async function logTranslationToOurApi(originalText, translatedText, sourceLang, targetLang, sourceUrl) {
    const endpointUrl = 'http://127.0.0.1:8000/api/v1/translation_logs'; // Targets local FastAPI
    const payload = { 
        originalText, 
        translatedText, 
        sourceLanguage: sourceLang, 
        targetLanguage: targetLang, 
        sourceUrl, 
        timestamp: new Date().toISOString() 
    };
    console.log("1Project Background: Logging (mock) translation to our API:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer YOUR_API_TOKEN' // Placeholder for future auth
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorDetails = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetails += ` - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) {
                errorDetails += ` - ${response.statusText || 'Server returned an error'}`;
            }
            console.warn(`Failed to log translation to our API: ${errorDetails}`);
            return { success: false, status: response.status, error: { message: "Failed to log translation.", details: errorDetails }};
        }
        console.log("Translation (mock) logged successfully to our API via local backend.");
        // const responseData = await response.json(); // If your API returns data
        return { success: true, status: response.status /*, data: responseData */};
    } catch (error) {
        console.error("Network error logging translation to our API:", error);
        return { success: false, status: null, error: { message: "Network error logging translation.", details: error.message }};
    }
}

// Helper function to collect snippet to your website's API (local backend)
async function collectSnippetToOurApi(selectedText, sourceUrl, pageTitle) {
    const endpointUrl = 'http://127.0.0.1:8000/api/v1/snippets'; // Targets local FastAPI
    const payload = { 
        selectedText, 
        sourceUrl, 
        pageTitle, 
        timestamp: new Date().toISOString() 
    };
    console.log("1Project Background: Sending snippet to our API:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer YOUR_API_TOKEN' // Placeholder
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) { 
            let errorDetails = `HTTP error! Status: ${response.status}`;
             try {
                const errorData = await response.json();
                errorDetails += ` - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) {
                errorDetails += ` - ${response.statusText || 'Server returned an error'}`;
            }
            console.warn(`Failed to collect snippet to our API: ${errorDetails}`);
            return { success: false, status: response.status, error: { message: "Failed to collect snippet.", details: errorDetails }};
        }
        console.log("Snippet collected successfully to our API via local backend.");
        // const responseData = await response.json(); // If your API returns data
        return { success: true, status: response.status /*, data: responseData */ };
    } catch (error) {
        console.error("Network error collecting snippet to our API:", error);
        return { success: false, status: null, error: { message: "Network error collecting snippet.", details: error.message, type: 'NetworkError' }};
    }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("1Project Background: Message received - Type:", request ? request.type : "Unknown request structure");

  if (!request || !request.type) {
    console.error("1Project Background: Invalid request received (no type).");
    sendResponse({ success: false, message: "Invalid request structure." });
    return false; // Not asynchronous if we respond immediately
  }

  if (request.type === "VISIT_OUR_SITE") {
    if (request.data && typeof request.data.url === 'string' && request.data.url.trim() !== '') {
      const urlToOpen = request.data.url;
      if (!urlToOpen.startsWith('http:') && !urlToOpen.startsWith('https:') && !urlToOpen.startsWith('ftp:')) {
        sendResponse({ success: false, message: `Invalid URL scheme for: ${urlToOpen}.` });
      } else if (chrome.tabs && typeof chrome.tabs.create === 'function') {
        chrome.tabs.create({ url: urlToOpen }, (tab) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, message: "Error creating tab: " + chrome.runtime.lastError.message });
          } else if (tab && tab.id) {
            sendResponse({ success: true, message: `Tab opened for ${urlToOpen}`, tabId: tab.id });
          } else {
            sendResponse({ success: false, message: "Tab object not returned after creation." });
          }
        });
      } else {
        sendResponse({ success: false, message: "chrome.tabs.create not available. Check 'tabs' permission." });
      }
    } else {
      sendResponse({ success: false, message: "No valid URL provided for VISIT_OUR_SITE." });
    }
    return true; // Indicates sendResponse will be called asynchronously by the chrome.tabs.create callback

  } else if (request.type === "TRANSLATE_TEXT") {
    const { selectedText, sourceUrl } = request.data || {}; // Get sourceUrl from request.data
    const targetLanguage = 'en'; // Fixed target language for now (as per MVP plan)

    if (!selectedText) {
        sendResponse({ status: 'error_translation', message: "No text provided for translation."});
        return false; // Synchronous response, not waiting for async
    }

    // Use the mock translation function
    getGoogleTranslation(selectedText, targetLanguage)
      .then(mockTranslationResult => {
        // Log the original text and the MOCK translated text to your backend
        logTranslationToOurApi(
            selectedText, 
            mockTranslationResult.translatedText, 
            mockTranslationResult.detectedSourceLanguage, 
            targetLanguage, 
            sourceUrl // Pass sourceUrl to your logging function
        ).then(logRes => { 
            if(logRes.success) {
                console.log("1Project Background: (Mock) Translation successfully logged to our API.");
            } else {
                console.warn("1Project Background: Logging (mock) translation to our API failed:", logRes.error);
            }
        }); 

        // Send the MOCK translation result back to content.js
        sendResponse({
          status: 'success_translation',
          originalText: selectedText,
          translatedText: mockTranslationResult.translatedText,
          sourceLanguage: mockTranslationResult.detectedSourceLanguage,
          targetLanguage: targetLanguage
        });
      })
      .catch(error => { // Should not happen with the mock, but good practice
        console.error("1Project Background: Error in mock getGoogleTranslation chain:", error);
        sendResponse({ status: 'error_translation', message: error.message || "Unknown error during mock translation" });
      });
    return true; // Indicates sendResponse will be called asynchronously

  } else if (request.type === "COLLECT_SNIPPET") {
    const { selectedText, sourceUrl, pageTitle } = request.data || {};
    if(!selectedText) {
        sendResponse({ success: false, message: "No text provided for snippet collection."});
        return false; 
    }
    collectSnippetToOurApi(selectedText, sourceUrl, pageTitle)
      .then(result => {
        sendResponse({ 
            success: result.success, 
            message: result.success ? "Snippet collected." : (result.error?.message || "Failed to collect snippet."),
            errorDetails: result.error 
        });
      })
      .catch(error => { 
        sendResponse({ success: false, message: "Unexpected error during snippet collection.", errorDetails: { message: error.message } });
      });
    return true; 

  } else if (request.type === "DIVE_ACTION") {
    const { selectedText, sourceUrl, pageTitle } = request.data || {};
    if(!selectedText) {
        sendResponse({ success: false, message: "No text provided for dive action."});
        return false; 
    }
    collectSnippetToOurApi(selectedText, sourceUrl, pageTitle) 
      .then(collectResult => {
        if (!collectResult.success) {
            console.warn("Dive action: snippet collection failed but proceeding to open tab. Error:", collectResult.error);
        }
        
        const diveUrl = `http://www.ourwebsite.com/review?term=${encodeURIComponent(selectedText)}`; // Ensure this is your correct dive URL
        if (chrome.tabs && typeof chrome.tabs.create === 'function') {
          chrome.tabs.create({ url: diveUrl }, (tab) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, collectionSucceeded: collectResult.success, message: "Error creating dive tab: " + chrome.runtime.lastError.message });
            } else if (tab && tab.id) {
                sendResponse({ success: true, collectionSucceeded: collectResult.success, message: `Dive tab opened for ${selectedText}`, tabId: tab.id });
            } else {
                sendResponse({ success: false, collectionSucceeded: collectResult.success, message: "Dive tab object not returned." });
            }
          });
        } else {
            sendResponse({ success: false, collectionSucceeded: collectResult.success, message: "chrome.tabs.create not available for dive." });
        }
      })
      .catch(error => { 
          sendResponse({ success: false, message: "Error processing dive action.", errorDetails: { message: error.message } });
      });
    return true; 
  }
  // If no other type matched, and you don't intend to send a response, you can let it be.
  // If you want to explicitly state no response for unhandled types, you could add:
  // else { return false; // Or sendResponse({success: false, message: "Unknown type"}) and return true if that itself could be async }
});