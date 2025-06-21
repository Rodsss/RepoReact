let activeButton = null;

/**
 * Removes the button from the page if it currently exists.
 */
function removeExistingButton() {
    if (activeButton) {
        activeButton.remove();
        activeButton = null;
    }
    // Remove the click-away listener to avoid memory leaks
    document.removeEventListener('click', handleDocumentClick);
}

/**
 * Handles clicks on the document to remove the button if the click is outside of it.
 * @param {MouseEvent} event
 */
function handleDocumentClick(event) {
    if (activeButton && !activeButton.contains(event.target)) {
        removeExistingButton();
    }
}


/**
 * Creates and displays a single "extension" button on the page next to the
 * user's selected text.
 *
 * @param {MouseEvent} event The dblclick event object.
 * @param {string} selectedText The text that was highlighted by the user.
 */
function createExtensionButton(event, selectedText) {
    // First, remove any button that might already be on the page.
    removeExistingButton();

    // Create a <button> element.
    activeButton = document.createElement('button');
    activeButton.id = 'project1-inpage-button';
    activeButton.textContent = 'extension';

    // Style the button to appear where the user clicked.
    activeButton.style.cssText = `
        position: absolute;
        z-index: 2147483647;
        cursor: pointer;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 5px 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        left: ${event.clientX + window.scrollX + 5}px;
        top: ${event.clientY + window.scrollY + 5}px;
    `;

    // Add the button to the document.
    document.body.appendChild(activeButton);

    // Add a click listener to the new button.
    activeButton.addEventListener('click', () => {
        // Send a message to the background script to open a new tab with the text
        chrome.runtime.sendMessage({
            type: 'OPEN_APP_WITH_TEXT',
            text: selectedText
        });
        
        // Remove the button from the page after clicking
        removeExistingButton();
    });

    // Add a listener to remove the button if the user clicks anywhere else on the page.
    // We wrap this in a timeout to prevent the original click from immediately closing it.
    setTimeout(() => {
        document.addEventListener('click', handleDocumentClick, { once: true });
    }, 100);
}

/**
 * Main event listener for the entire page.
 */
document.addEventListener('dblclick', function(event) {
    // Don't show the button if the user is double-clicking inside an input field or textarea
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
        return;
    }

    const selectedText = window.getSelection().toString().trim();

    // If text is selected, call the function to create our button.
    if (selectedText.length > 0) {
        createExtensionButton(event, selectedText);
    }
});