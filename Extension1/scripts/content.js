//
// FILE: Extension1/scripts/content.js (Final Consolidated Version)
//
let activeIcon = null;
let activeMenu = null;
let hideMenuTimeout = null;

/**
 * Creates the icon on the page when text is double-clicked.
 */
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

/**
 * Creates, positions, and displays the menu with "Translate" and "Raking" buttons.
 */
function showMenu(iconElement, selectedText) {
    if (activeMenu) return;

    // --- Main Menu Container ---
    activeMenu = document.createElement('div');
    activeMenu.id = 'project1-menu';
    activeMenu.style.cssText = `
        position: absolute; 
        background: #2a3447; 
        border: 1px solid #4a4e54; 
        border-radius: 5px; 
        padding: 5px; 
        z-index: 1000000; 
        display: flex; 
        flex-direction: column;
        gap: 5px;
    `;

    // --- Button Container ---
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `display: flex; gap: 5px;`;
    
    // --- Translate Button ---
    const translateBtn = document.createElement('button');
    translateBtn.textContent = 'Translate';
    translateBtn.dataset.action = 'translate-text';
    translateBtn.style.cssText = 'background: #333; border: 1px solid #777; color: white; padding: 5px 10px; cursor: pointer; border-radius: 3px;';
    
    // --- Raking Button ---
    const rakingBtn = document.createElement('button');
    rakingBtn.textContent = 'Raking';
    rakingBtn.dataset.action = 'rake-text';
    rakingBtn.style.cssText = 'background: #333; border: 1px solid #777; color: white; padding: 5px 10px; cursor: pointer; border-radius: 3px;';

    buttonContainer.appendChild(translateBtn);
    buttonContainer.appendChild(rakingBtn);
    activeMenu.appendChild(buttonContainer);

    // --- Translation Result Area ---
    const translationResultDiv = document.createElement('div');
    translationResultDiv.id = 'project1-translation-result';
    translationResultDiv.style.cssText = `
        color: #e94560; 
        padding-top: 5px; 
        border-top: 1px solid #4a4e54; 
        margin-top: 5px;
        min-height: 20px;
        font-size: 14px;
        display: none;
    `;
    activeMenu.appendChild(translationResultDiv);
    
    // --- Positioning and Event Handling ---
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

/**
 * Asks the background script to perform the translation API call.
 */
async function getTranslation(text) {
    const resultDiv = document.getElementById('project1-translation-result');
    if (!resultDiv) return;

    resultDiv.style.display = 'block';
    resultDiv.textContent = 'Translating...';
    
    try {
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

/**
 * Handles clicks on the "Translate" and "Raking" buttons.
 */
function handleMenuAction(action, text) {
    if (action === 'translate-text') {
        getTranslation(text);
        // Keep the menu open so the user can see the translation
        clearTimeout(hideMenuTimeout); 
        hideMenuTimeout = setTimeout(removeExistingIconAndMenu, 2000); // Close after 2 seconds
        
    } else if (action === 'rake-text') {
        // Send the text to the background script to be opened in a new tab
        chrome.runtime.sendMessage({
            type: 'RAKE_TEXT',
            data: {
                selectedText: text
            }
        });
        removeExistingIconAndMenu(); // Close menu immediately
    }
}


/**
 * Removes the icon and menu from the page.
 */
function removeExistingIconAndMenu() {
    if (activeIcon) activeIcon.remove();
    if (activeMenu) activeMenu.remove();
    activeIcon = null;
    activeMenu = null;
    clearTimeout(hideMenuTimeout);
}

// --- Main Event Listener ---
document.addEventListener('dblclick', function(event) {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        createIcon(event.clientX, event.clientY, selectedText);
    }
});