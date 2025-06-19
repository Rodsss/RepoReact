// FILE: Extension1/scripts/content.js (Final Version)

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
 * Creates, positions, and displays the menu with the "Collect" button.
 */
function showMenu(iconElement, selectedText) {
    if (activeMenu) return;

    activeMenu = document.createElement('div');
    activeMenu.id = 'project1-menu';
    activeMenu.style.cssText = `position: absolute; background: #2a3447; border: 1px solid #4a4e54; border-radius: 5px; padding: 5px; z-index: 1000000; display: flex; gap: 5px;`;

    const collectBtn = document.createElement('button');
    collectBtn.textContent = 'Collect';
    collectBtn.dataset.action = 'collect-text'; // The action name
    collectBtn.style.cssText = 'background: #333; border: 1px solid #777; color: white; padding: 5px 10px; cursor: pointer; border-radius: 3px;';
    
    activeMenu.appendChild(collectBtn);
    
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
 * Handles the click on the "Collect" button by sending a message.
 */
function handleMenuAction(action, text) {
    if (action === 'collect-text') {
        // This sends the message to background.js
        chrome.runtime.sendMessage({ 
            type: 'COLLECT_TEXT', 
            data: { selectedText: text }
        });
    }
    removeExistingIconAndMenu();
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