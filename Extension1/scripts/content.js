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
 * MODIFIED: Creates, positions, and displays the menu with "Translate" and "Collect" buttons.
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
    
    // --- Collect Button ---
    const collectBtn = document.createElement('button');
    collectBtn.textContent = 'Collect';
    collectBtn.dataset.action = 'collect-text';
    collectBtn.style.cssText = 'background: #333; border: 1px solid #777; color: white; padding: 5px 10px; cursor: pointer; border-radius: 3px;';

    buttonContainer.appendChild(translateBtn);
    buttonContainer.appendChild(collectBtn);
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
        display: none; /* Hidden by default */
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
 * ADDED: New helper function to perform in-page translation.
 */
async function getTranslation(text) {
    const resultDiv = document.getElementById('project1-translation-result');
    if (!resultDiv) return;

    resultDiv.style.display = 'block'; // Show the result area
    resultDiv.textContent = 'Translating...';
    try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/translate", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        resultDiv.textContent = data.translated_text;
    } catch (error) {
        console.error("Translation request failed:", error);
        resultDiv.textContent = 'Translation failed.';
    }
}

/**
 * MODIFIED: This function now handles the two different button actions.
 */
function handleMenuAction(action, text) {
    if (action === 'translate-text') {
        // Perform the in-page translation
        getTranslation(text);
        // Send text to dashboard in the background
        chrome.runtime.sendMessage({
            type: 'COLLECT_TEXT',
            data: {
                selectedText: text,
                shouldOpenTab: false // Do not open a new tab
            }
        });
        // Do not close the menu immediately, so the user can see the translation
        clearTimeout(hideMenuTimeout); 
        hideMenuTimeout = setTimeout(removeExistingIconAndMenu, 2000); // Close after 2 seconds
        
    } else if (action === 'collect-text') {
        // Send text to dashboard and open it for inspection
        chrome.runtime.sendMessage({
            type: 'COLLECT_TEXT',
            data: {
                selectedText: text,
                shouldOpenTab: true // Open a new tab
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