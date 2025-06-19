let activeIcon = null;
let activeMenu = null;
let hideMenuTimeout = null;

// --- THIS FUNCTION REMAINS UNCHANGED ---
function createIcon(x, y, text) {
    removeExistingIconAndMenu();
    activeIcon = document.createElement('img');
    activeIcon.id = 'project1-icon';
    activeIcon.style.cssText = `position: absolute; z-index: 999999; cursor: pointer; width: 24px; height: 24px; left: ${x + window.scrollX + 5}px; top: ${y + window.scrollY + 5}px;`;

    chrome.runtime.sendMessage({ type: "GET_ICON_URL" }, (response) => {
        if (response && response.success) {
            activeIcon.src = response.url;
        } else {
            console.error("Content script could not get icon URL.");
        }
    });

    document.body.appendChild(activeIcon);

    activeIcon.addEventListener('mouseenter', () => {
        clearTimeout(hideMenuTimeout);
        showMenu(activeIcon, text);
    });
    activeIcon.addEventListener('mouseleave', () => {
        hideMenuTimeout = setTimeout(removeExistingIconAndMenu, 300);
    });
}

// --- THIS FUNCTION REMAINS UNCHANGED ---
function showMenu(iconElement, selectedText) {
    if (activeMenu) return;

    // ... (All the code for creating the menu, buttons, and result div is identical)
    activeMenu = document.createElement('div');
    activeMenu.id = 'project1-menu';
    // ... styles ...
    const buttonContainer = document.createElement('div');
    // ... styles ...
    const translateBtn = document.createElement('button');
    translateBtn.textContent = 'Translate';
    translateBtn.dataset.action = 'translate-text';
    // ... styles ...
    const collectBtn = document.createElement('button');
    collectBtn.textContent = 'Collect';
    collectBtn.dataset.action = 'collect-text';
    // ... styles ...
    buttonContainer.appendChild(translateBtn);
    buttonContainer.appendChild(collectBtn);
    activeMenu.appendChild(buttonContainer);
    const translationResultDiv = document.createElement('div');
    translationResultDiv.id = 'project1-translation-result';
    // ... styles ...
    activeMenu.appendChild(translationResultDiv);
    
    const iconRect = iconElement.getBoundingClientRect();
    document.body.appendChild(activeMenu);
    activeMenu.style.left = `${iconRect.left + window.scrollX}px`;
    activeMenu.style.top = `${iconRect.bottom + window.scrollY + 5}px`;

    activeMenu.addEventListener('mouseenter', () => clearTimeout(hideMenuTimeout));
    activeMenu.addEventListener('mouseleave', () => hideMenuTimeout = setTimeout(removeExistingIconAndMenu, 300));
    activeMenu.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (button && button.dataset.action) {
            handleMenuAction(button.dataset.action, selectedText);
        }
    });
}


// ==================================================================
//               ONLY THIS FUNCTION'S BODY IS CHANGED
// ==================================================================
/**
 * REFACTORED: This function now asks the background script to make the API call
 * instead of using fetch() directly.
 */
async function getTranslation(text) {
    const resultDiv = document.getElementById('project1-translation-result');
    if (!resultDiv) return;

    resultDiv.style.display = 'block'; // Show the result area
    resultDiv.textContent = 'Translating...';
    
    try {
        // This is the core change: send a message to background.js
        const response = await chrome.runtime.sendMessage({
            type: "API_REQUEST",
            payload: {
                endpoint: "/translate",
                options: {
                    method: 'POST',
                    body: JSON.stringify({ text: text })
                }
            }
        });

        if (response.error) {
            throw new Error(response.error);
        }
        
        resultDiv.textContent = response.data.translated_text;

    } catch (error) {
        console.error("Translation request failed:", error);
        resultDiv.textContent = 'Translation failed.';
    }
}
// ==================================================================
//                     END OF CHANGED SECTION
// ==================================================================


// --- THIS FUNCTION REMAINS UNCHANGED ---
function handleMenuAction(action, text) {
    if (action === 'translate-text') {
        getTranslation(text);
        chrome.runtime.sendMessage({
            type: 'COLLECT_TEXT',
            data: {
                selectedText: text,
                shouldOpenTab: false
            }
        });
        clearTimeout(hideMenuTimeout); 
        hideMenuTimeout = setTimeout(removeExistingIconAndMenu, 2000);
        
    } else if (action === 'collect-text') {
        chrome.runtime.sendMessage({
            type: 'COLLECT_TEXT',
            data: {
                selectedText: text,
                shouldOpenTab: true
            }
        });
        removeExistingIconAndMenu();
    }
}

// --- THIS FUNCTION REMAINS UNCHANGED ---
function removeExistingIconAndMenu() {
    if (activeIcon) activeIcon.remove();
    if (activeMenu) activeMenu.remove();
    activeIcon = null;
    activeMenu = null;
    clearTimeout(hideMenuTimeout);
}

// --- THIS EVENT LISTENER REMAINS UNCHANGED ---
document.addEventListener('dblclick', function(event) {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        createIcon(event.clientX, event.clientY, selectedText);
    }
});