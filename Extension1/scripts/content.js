// scripts/content.js
// Assumes uiBuilder.js and domPositioning.js have loaded and defined window.myproject1Utils

let activeIcon = null;
let activeMenu = null;
let hideMenuTimeout = null;
let feedbackNotificationTimeout = null; 

function showFeedbackNotification(message, type = 'success', duration = 3000) {
    let notificationElement = document.getElementById('project1-feedback-notification');
    if (!notificationElement) {
        notificationElement = document.createElement('div');
        notificationElement.id = 'project1-feedback-notification';
        document.body.appendChild(notificationElement);
    }
    notificationElement.textContent = message;
    notificationElement.className = 'visible'; 
    if (type === 'error') {
        notificationElement.classList.add('error');
    } else {
        notificationElement.classList.remove('error');
    }
    if (feedbackNotificationTimeout) {
        clearTimeout(feedbackNotificationTimeout);
    }
    feedbackNotificationTimeout = setTimeout(() => {
        notificationElement.classList.remove('visible');
    }, duration);
}

// --- Reading Time Feature (Keep as is) ---
const articleElementForReadingTime = document.querySelector("article");
if (articleElementForReadingTime) {
    const textContent = articleElementForReadingTime.textContent;
    const wordMatchRegExp = /[^\s]+/g;
    const words = textContent.matchAll(wordMatchRegExp);
    const wordCount = [...words].length;
    const readingTime = Math.round(wordCount / 200);
    const badge = document.createElement("p");
    badge.classList.add("color-secondary-text", "type--caption");
    badge.textContent = `⏱️ ${readingTime} min read`;
    const heading = articleElementForReadingTime.querySelector("h1");
    const dateElement = articleElementForReadingTime.querySelector("time")?.parentNode;
    (dateElement ?? heading)?.insertAdjacentElement("afterend", badge);
}

// --- Icon & Menu Feature ---
document.addEventListener('dblclick', function(event) {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        const clickX = event.clientX;
        const clickY = event.clientY;
        removeExistingIconAndMenu(); 
        createIcon(clickX, clickY, selectedText);
    }
});

function createIcon(x, y, text) {
    // ... (createIcon function remains the same) ...
    activeIcon = document.createElement('img');
    try {
        activeIcon.src = chrome.runtime.getURL('images/icon-16.png');
    } catch (e) {
        console.error("project1 Error: Could not get icon URL.", e);
        activeIcon.alt = "icon";
    }
    activeIcon.id = 'project1-icon';
    activeIcon.style.position = 'absolute';
    activeIcon.style.left = `${x + window.scrollX + 5}px`;
    activeIcon.style.top = `${y + window.scrollY + 5}px`;
    activeIcon.addEventListener('mouseenter', () => {
        clearTimeout(hideMenuTimeout);
        showMenu(activeIcon, text);
    });
    activeIcon.addEventListener('mouseleave', () => {
        hideMenuTimeout = setTimeout(removeExistingIconAndMenu, 300);
    });
    document.body.appendChild(activeIcon);
}

function showMenu(iconElement, selectedText) {
    // ... (showMenu function remains the same) ...
    if (activeMenu) {
        clearTimeout(hideMenuTimeout);
        return;
    }
    if (!window.myproject1Utils ||
        typeof window.myproject1Utils.buildMenuDOM !== 'function' ||
        typeof window.myproject1Utils.calculateOptimalMenuPosition !== 'function') {
        console.error("project1 FATAL ERROR: Utility functions (myproject1Utils) are not defined.");
        return;
    }
    activeMenu = window.myproject1Utils.buildMenuDOM(selectedText);
    if (!activeMenu || typeof activeMenu.appendChild !== 'function') {
        console.error("project1 FATAL ERROR: buildMenuDOM did not return a valid DOM element.");
        activeMenu = null;
        return;
    }
    activeMenu.style.position = 'absolute';
    activeMenu.style.visibility = 'hidden';
    activeMenu.style.left = '-9999px';
    activeMenu.style.top = '-9999px';
    document.body.appendChild(activeMenu);
    const menuWidth = activeMenu.offsetWidth;
    const menuHeight = activeMenu.offsetHeight;
    if (menuWidth === 0 || menuHeight === 0) {
        console.warn("project1 WARNING: Menu has zero dimensions. Removing menu.");
        if(activeMenu) activeMenu.remove();
        activeMenu = null;
        return;
    }
    const iconRect = iconElement.getBoundingClientRect();
    const { left: finalMenuLeft, top: finalMenuTop } = window.myproject1Utils.calculateOptimalMenuPosition(
        iconRect, menuWidth, menuHeight, window.innerWidth, window.innerHeight, window.scrollX, window.scrollY
    );
    activeMenu.style.left = `${finalMenuLeft}px`;
    activeMenu.style.top = `${finalMenuTop}px`;
    activeMenu.style.visibility = 'visible';
    activeMenu.addEventListener('mouseenter', () => clearTimeout(hideMenuTimeout));
    activeMenu.addEventListener('mouseleave', () => {
        hideMenuTimeout = setTimeout(removeExistingIconAndMenu, 300);
    });
    activeMenu.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (button && button.dataset.action) {
            const action = button.dataset.action;
            handleMenuAction(action, selectedText, activeMenu);
        }
    });
}

function displayTranslationInMenu(menuElement, originalText, translatedText, sourceLang, targetLang) {
    // ... (displayTranslationInMenu function remains the same) ...
    if (!menuElement) {
        console.warn("project1 displayTranslationInMenu: menuElement is null.");
        return;
    }
    const translateButton = menuElement.querySelector('button[data-action="translate-text"]');
    if (translateButton) {
        translateButton.style.display = 'none';
    }
    let translationArea = menuElement.querySelector('#project1-translation-area');
    if (!translationArea) {
        translationArea = document.createElement('div');
        translationArea.id = 'project1-translation-area';
        const collectButton = menuElement.querySelector('button[data-action="collect-text"]');
        if (collectButton) menuElement.insertBefore(translationArea, collectButton);
        else menuElement.appendChild(translationArea);
    }
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };
    translationArea.innerHTML = `
        <div class="translation-block">
            <span class="translation-label">Original (${escapeHtml(sourceLang) || 'auto'}):</span>
            <em class="translation-text">${escapeHtml(originalText)}</em>
        </div>
        <div class="translation-block">
            <span class="translation-label">Translated (${escapeHtml(targetLang)}):</span>
            <strong class="translation-text translated-text">${escapeHtml(translatedText)}</strong>
        </div>
    `;
    translationArea.style.display = 'block';
}

// --- MODIFIED: handleMenuAction for more robust error feedback ---
function handleMenuAction(action, text, menuElement) {
    console.log(`project1 Action: ${action}, Text: "${text}"`);
    const pageUrl = window.location.href;
    const pageTitle = document.title;

    if (action === 'visit-our-site') {
        chrome.runtime.sendMessage(
            { type: 'VISIT_OUR_SITE', data: { url: 'http://localhost:5000' } }, 
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("1P sendMessage Error (Visit):", chrome.runtime.lastError.message);
                    showFeedbackNotification(`Error: ${chrome.runtime.lastError.message}`, "error");
                    return;
                }
                if (response && response.success) {
                    // Feedback might be optional as a new tab opens
                    // showFeedbackNotification("Opening site...", "success", 1500); 
                } else if (response) {
                    showFeedbackNotification(`Could not open site: ${response.message || 'Unknown error.'}`, "error");
                } else {
                    showFeedbackNotification("No response from background for visit site.", "error");
                }
            }
        );
        removeExistingIconAndMenu();

    } else if (action === 'translate-text') {
        chrome.runtime.sendMessage(
            { type: 'TRANSLATE_TEXT', data: { selectedText: text, sourceUrl: pageUrl }},
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("project1 Translation sendMessage Error:", chrome.runtime.lastError.message);
                    if (menuElement) displayTranslationInMenu(menuElement, text, "Error: Could not translate.", "", "");
                    showFeedbackNotification(`Translation failed: ${chrome.runtime.lastError.message}`, "error");
                    return;
                }
                if (response && response.status === 'success_translation') {
                    if (menuElement) {
                        displayTranslationInMenu(menuElement, response.originalText, response.translatedText, response.sourceLanguage, response.targetLanguage);
                    }
                    // Optional: showFeedbackNotification("Text translated & logged!", "success"); 
                    // The in-menu display is primary feedback here.
                } else if (response && response.status === 'error_translation') {
                    console.error("project1 Translation Error from background:", response.message);
                    if (menuElement) displayTranslationInMenu(menuElement, text, `Error: ${response.message || "Translation failed."}`, "", "");
                    showFeedbackNotification(`Translation Error: ${response.message || "Unknown error."}`, "error");
                } else {
                    showFeedbackNotification("No/invalid response from background for translate.", "error");
                    if (menuElement) displayTranslationInMenu(menuElement, text, "Error: Communication failed.", "", "");
                }
            }
        );
        // Menu STAYS OPEN for translate action

    } else if (action === 'collect-text') {
        chrome.runtime.sendMessage(
            { type: 'COLLECT_SNIPPET', data: { selectedText: text, sourceUrl: pageUrl, pageTitle: pageTitle }},
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("1P sendMessage Error (Collect):", chrome.runtime.lastError.message);
                    showFeedbackNotification(`Save failed: ${chrome.runtime.lastError.message}`, "error");
                    return;
                }
                if (response && response.success) {
                    console.log("1P Background (Collect) responded:", response);
                    showFeedbackNotification("Snippet saved!", "success");
                } else if (response) { // response exists but response.success is false
                    console.error("1P Background (Collect) error:", response.message);
                    showFeedbackNotification(`Save failed: ${response.message || "Unknown server error."}`, "error");
                } else { // No response object
                    showFeedbackNotification("Save failed: No response from background script.", "error");
                }
            }
        );
        removeExistingIconAndMenu();

    } else if (action === 'dive-text') {
        chrome.runtime.sendMessage(
            { type: 'DIVE_ACTION', data: { selectedText: text, sourceUrl: pageUrl, pageTitle: pageTitle }},
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("1P sendMessage Error (Dive):", chrome.runtime.lastError.message);
                    showFeedbackNotification(`Dive failed: ${chrome.runtime.lastError.message}`, "error");
                    return;
                }
                if (response && response.success) {
                    console.log("1P Background (Dive) responded:", response);
                    // Main feedback is the new tab.
                } else if (response) {
                     showFeedbackNotification(`Dive error: ${response.message || 'Could not complete dive action.'}`, "error");
                } else {
                    showFeedbackNotification("Dive failed: No response from background script.", "error");
                }
            }
        );
        removeExistingIconAndMenu();
    } else {
        console.warn(`project1: Unknown menu action received: ${action}`);
        removeExistingIconAndMenu();
    }
}

function removeExistingIconAndMenu() {
    // ... (removeExistingIconAndMenu function remains the same) ...
    clearTimeout(hideMenuTimeout);
    if (activeIcon) {
        activeIcon.remove();
        activeIcon = null;
    }
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
}

document.addEventListener('click', function(event) {
    // ... (click listener to remove icon/menu remains the same) ...
    const isClickOnIcon = activeIcon && activeIcon.contains(event.target);
    const isClickOnMenu = activeMenu && activeMenu.contains(event.target);
    if (!isClickOnIcon && !isClickOnMenu) {
        if (activeIcon || activeMenu) {
            removeExistingIconAndMenu();
        }
    }
});


