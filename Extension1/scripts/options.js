//
// FILE: Extension1/scripts/content.js (REVISED)
//
let activeButton = null;

/**
 * Removes the button from the page if it exists.
 */
function removeButton() {
    if (activeButton) {
        activeButton.remove();
        activeButton = null;
    }
}

/**
 * Creates the "extension" button on the page when text is double-clicked.
 * @param {MouseEvent} event - The mouse event from the double-click.
 * @param {string} selectedText - The text that was selected.
 */
function createExtensionButton(event, selectedText) {
    // Remove any existing button first
    removeButton();

    // Create the button element
    activeButton = document.createElement('button');
    activeButton.id = 'project1-extension-button';
    activeButton.textContent = 'extension';

    // Basic styling to position the button
    activeButton.style.cssText = `
        position: absolute;
        z-index: 999999;
        cursor: pointer;
        padding: 6px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #f0f0f0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        left: ${event.clientX + window.scrollX + 5}px;
        top: ${event.clientY + window.scrollY + 5}px;
    `;

    // Add the button to the page
    document.body.appendChild(activeButton);

    // --- Define Button Action ---
    // Currently, it only logs the selected text. We can define the real action later.
    activeButton.addEventListener('click', () => {
        console.log('Button clicked for text:', selectedText);
        // The original menu had "Translate" and "Raking" actions.
        // We can add that logic here.
        removeButton(); // Remove the button after it's clicked.
    });

    // Add a listener to remove the button if the user clicks elsewhere on the page
    setTimeout(() => {
        document.addEventListener('click', handleDocumentClick, { once: true });
    }, 100);
}

/**
 * Removes the button if a click occurs outside of it.
 * @param {MouseEvent} event - The mouse click event.
 */
function handleDocumentClick(event) {
    if (activeButton && !activeButton.contains(event.target)) {
        removeButton();
    }
}


// --- Main Event Listener ---
// Listens for a double-click anywhere on the page.
document.addEventListener('dblclick', (event) => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        // When text is selected, create the button.
        createExtensionButton(event, selectedText);
    }
});