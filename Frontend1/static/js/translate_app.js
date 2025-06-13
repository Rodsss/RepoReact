// --- STATE MANAGEMENT ---


let flashcardDeck = [];
let currentCardIndex = 0;

let currentView = 'history'; // Can be 'lists', 'history', or 'stack_content'
let selectedItems = new Set(); // Use a Set to store IDs of selected items

// --- MAIN EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Listeners for Pane 3 view switching
    document.getElementById('show-flashcard-view').addEventListener('click', () => switchPane3View('flashcards'));
    document.getElementById('show-notes-view').addEventListener('click', () => switchPane3View('notes'));
    // Attach listeners to static elements once
    document.getElementById('show-lists-view').addEventListener('click', () => switchView('lists'));
    document.getElementById('show-history-view').addEventListener('click', () => switchView('history'));
    // The old save-button is gone, so we remove its listener.
    // document.getElementById('save-button').addEventListener('click', handleSaveClick);
    document.getElementById('create-list-button').addEventListener('click', handleCreateListClick);
    document.getElementById('main-delete-button').addEventListener('click', handleDeleteSelectedClick);
    document.getElementById('translate-button').addEventListener('click', handleOnPageTranslate);
    document.getElementById('select-all-checkbox').addEventListener('click', handleSelectAllClick);
    // Note: The original #feature-flashcard-button was removed from the HTML, this listener will not find an element.
    const featureFlashcardButton = document.getElementById('feature-flashcard-button');
    if (featureFlashcardButton) {
        featureFlashcardButton.addEventListener('click', startFlashcardSession);
    }

    // Add listener for the new save button
    document.getElementById('save-to-list-button').addEventListener('click', handleSaveToListClick);

    // Listeners for "Add to Deck" feature (middle pane)
    document.getElementById('add-to-deck-button').addEventListener('click', handleAddToDeckClick);
    document.getElementById('cancel-copy-btn').addEventListener('click', () => {
        document.getElementById('add-to-deck-dropdown').classList.add('hidden');
    });
    document.getElementById('confirm-copy-btn').addEventListener('click', handleConfirmCopyToDeck);


    // Initial setup
    switchView(currentView);
    populateTextboxFromUrl();
    fetchAndPopulateStacksDropdown(); // <-- Add this call
    populateDeckSelectorMenu(); // For the study deck dropdown
    // Set the initial view for Pane 3
    switchPane3View('flashcards');
    initializeNotesEditor(); // Set up the notes editor toolbar
 
});


// 1. Fetch stacks for the dropdown
async function fetchAndPopulateStacksDropdown() {
    const dropdown = document.getElementById('stack-select-dropdown');
    if (!dropdown) return;
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/stacks`;

    try {
        const stacks = await (await fetch(apiUrl)).json();
        dropdown.innerHTML = '<option value="" disabled selected>Select a list</option>'; // Reset
        if (stacks.length > 0) {
            stacks.forEach(stack => {
                const option = document.createElement('option');
                option.value = stack.stack_id;
                option.textContent = stack.stack_name;
                dropdown.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching stacks for dropdown:", error);
        dropdown.innerHTML = '<option value="" disabled>Could not load lists</option>';
    }
}


// 2. Handle the new "Save to List" button

async function handleAddToDeckClick() {
    const dropdown = document.getElementById('add-to-deck-dropdown');
    const isHidden = dropdown.classList.contains('hidden');

    if (!isHidden) {
        dropdown.classList.add('hidden');
        return;
    }

    // If it's hidden, show it and populate it
    const select = document.getElementById('dest-deck-select');
    select.innerHTML = '<option>Loading decks...</option>';

    try {
        const userId = "default-user";
        const stacks = await (await fetch(`/api/v1/users/${userId}/stacks`)).json();

        let optionsHTML = '<option value="" disabled selected>Choose a deck...</option>';
        if (stacks.length > 0) {
            stacks.forEach(stack => {
                optionsHTML += `<option value="<span class="math-inline">\{stack\.stack\_id\}"\></span>{stack.stack_name}</option>`;
            });
        } else {
            optionsHTML = '<option value="" disabled>No decks found</option>';
        }
        select.innerHTML = optionsHTML;
        dropdown.classList.remove('hidden'); // Show the dropdown
    } catch (error) {
        console.error("Failed to fetch decks for dropdown:", error);
        select.innerHTML = '<option value="" disabled>Error loading decks</option>';
    }
}

async function handleConfirmCopyToDeck() {
    const dropdown = document.getElementById('add-to-deck-dropdown');
    const destStackId = document.getElementById('dest-deck-select').value;
    const itemsToCopy = Array.from(selectedItems);

    if (!destStackId) {
        alert("Please select a destination deck.");
        return;
    }

    try {
        const response = await fetch(`/api/v1/stacks/${destStackId}/add_flashcards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flashcard_ids: itemsToCopy })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Server error');
        }
        
        alert(`Successfully copied ${itemsToCopy.length} items.`);
        dropdown.classList.add('hidden'); // Hide dropdown on success
        clearSelectionsAndRender(); // Unselect items and refresh view
    } catch (error) {
        alert(`Error copying items: ${error.message}`);
    }
}


// Populates the new deck selector menu in the right pane
async function populateDeckSelectorMenu() {
    const menuButton = document.getElementById('deck-menu-button');
    const dropdown = document.getElementById('deck-menu-dropdown');
    if (!menuButton || !dropdown) return;

    menuButton.addEventListener('click', () => dropdown.classList.toggle('hidden'));

    try {
        const userId = "default-user";
        const stacks = await (await fetch(`/api/v1/users/${userId}/stacks`)).json();

        if (stacks.length > 0) {
            dropdown.innerHTML = ''; // Clear "Loading..."
            stacks.forEach(stack => {
                const deckLink = document.createElement('a');
                deckLink.href = '#';
                deckLink.textContent = stack.stack_name;
                deckLink.dataset.deckId = stack.stack_id;
                deckLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    startDeckStudySession(stack.stack_id, stack.stack_name);
                    dropdown.classList.add('hidden'); // Hide menu after selection
                });
                dropdown.appendChild(deckLink);
            });
        } else {
            dropdown.innerHTML = '<p style="padding: 8px 12px;">No decks found.</p>';
        }
    } catch (error) {
        console.error("Failed to fetch decks for menu:", error);
        dropdown.innerHTML = '<p style="padding: 8px 12px;">Error loading decks.</p>';
    }
}

// Starts a study session for a specific deck, overriding the general session
async function startDeckStudySession(deckId, deckName) {
    document.querySelector('.dashboard-container').classList.add('flashcard-mode-active');
    const container = document.getElementById('flashcard-container');
    container.innerHTML = `<p>Loading deck: <strong>${deckName}</strong>...</p>`;

    try {
        const userId = "default-user";
        const apiUrl = `/api/v1/users/<span class="math-inline">\{userId\}/stacks/</span>{deckId}/flashcards`;
        const items = await (await fetch(apiUrl)).json();

        if (items.length === 0) {
            container.innerHTML = `<div class="flashcard-placeholder"><p>This deck is empty. Add some cards!</p></div>`;
            return;
        }

        // Use the global deck variable and render logic for the study session
        flashcardDeck = items.sort(() => Math.random() - 0.5);
        currentCardIndex = 0;
        renderCurrentFlashcard(); // This function is already defined and can be reused

    } catch (error) {
        console.error(`Failed to fetch flashcards for deck ${deckId}:`, error);
        container.innerHTML = '<p class="error-message">Could not load this deck.</p>';
    }
}


async function handleSaveToListClick() {
    const textInput = document.getElementById('translate-input');
    const textToSave = textInput.value.trim();
    const stackDropdown = document.getElementById('stack-select-dropdown');
    const selectedStackId = stackDropdown.value;

    if (!textToSave) {
        alert("The textbox is empty.");
        return;
    }
    if (!selectedStackId) {
        alert("Please select a list to save to.");
        return;
    }

    try {
        const response = await fetch(`/api/v1/stacks/${selectedStackId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: textToSave,
                sourceUrl: window.location.href, // Or any other relevant source
                pageTitle: document.title 
            })
        });

        if (response.ok) {
            alert("Item saved successfully!");
            // Optionally, clear the input
            textInput.value = '';
            // Refresh the middle pane if viewing that list's content
            if (currentView === 'history') {
               renderMiddlePane();
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to save item.");
        }
    } catch (error) {
        console.error("Failed to save item to list:", error);
        alert(`Error: ${error.message}`);
    }
}





// --- VIEW AND RENDER LOGIC ---
function switchView(view) {
    currentView = view;
    document.getElementById('show-lists-view').classList.toggle('active', view === 'lists');
    document.getElementById('show-history-view').classList.toggle('active', view === 'history');
    document.getElementById('create-list-button').style.display = (view === 'lists') ? 'inline-block' : 'none';
    clearSelectionsAndRender();
}

function renderMiddlePane() {
    const addToListUI = document.getElementById('add-to-list-ui');
    if (addToListUI) addToListUI.remove();

    // The view determines which fetch function to call
    if (currentView === 'lists') {
        fetchAndDisplayStacks();
    } else if (currentView === 'history') {
        fetchAndDisplayHistory();
    }
    // Note: 'stack_content' view is called directly by its own function
}

function clearSelectionsAndRender() {
    selectedItems.clear();
    updateActionButtonsVisibility();
    updateSelectAllCheckboxState();
    renderMiddlePane();
}

// --- FLASHCARD FEATURE LOGIC ---

async function startFlashcardSession() {
    // Activate the three-pane layout
    document.querySelector('.dashboard-container').classList.add('flashcard-mode-active');

    // Fetch all items to serve as our deck of flashcards
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/collected_items`;

    try {
        const items = await (await fetch(apiUrl)).json();
        if (items.length === 0) {
            document.getElementById('flashcard-container').innerHTML = '<p>No flashcards to study. Save some items first!</p>';
            return;
        }

        // Shuffle the deck for variety
        flashcardDeck = items.sort(() => Math.random() - 0.5);
        currentCardIndex = 0;

        // Render the first card
        renderCurrentFlashcard();

    } catch (error) {
        console.error("Failed to fetch flashcards:", error);
        document.getElementById('flashcard-container').innerHTML = '<p class="error-message">Could not load flashcards.</p>';
    }
}

function renderCurrentFlashcard() {
    const container = document.getElementById('flashcard-container');
    const card = flashcardDeck[currentCardIndex];

    if (!card) {
        container.innerHTML = `
            <div class="flashcard-placeholder">
                <p>Session complete!</p>
                <button id="restart-flashcards">Study Again</button>
            </div>`;
        document.getElementById('restart-flashcards').addEventListener('click', startFlashcardSession);
        return;
    }

    const cardHTML = `
        <div class="flashcard">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    ${card.front_text}
                </div>
                <div class="flashcard-back">
                    ${card.back_text || "(No back text)"}
                </div>
            </div>
        </div>
        <div class="flashcard-controls">
            <button id="flip-card-btn">Flip</button>
            <button id="incorrect-btn" class="danger-button">Incorrect</button>
            <button id="correct-btn">Correct</button>
        </div>
        <div class="flashcard-progress">
            Card ${currentCardIndex + 1} of ${flashcardDeck.length}
        </div>
    `;
    container.innerHTML = cardHTML;

    // Add event listeners for the new card's buttons
    document.getElementById('flip-card-btn').addEventListener('click', () => {
        document.querySelector('.flashcard').classList.toggle('is-flipped');
    });
    document.getElementById('correct-btn').addEventListener('click', () => handleFlashcardReview('correct'));
    document.getElementById('incorrect-btn').addEventListener('click', () => handleFlashcardReview('incorrect'));
}

async function handleFlashcardReview(outcome) {
    const card = flashcardDeck[currentCardIndex];
    const userId = "default-user";

    // Send the review to the backend
    try {
        await fetch(`/api/v1/users/<span class="math-inline">\{userId\}/flashcards/</span>{card.flashcard_id}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outcome: outcome })
        });
    } catch (error) {
        console.error("Failed to submit review:", error);
        // Continue to next card even if logging fails
    }

    // Move to the next card
    currentCardIndex++;
    renderCurrentFlashcard();
}


// --- RENDERING SPECIFIC VIEWS ---

// Renders the list of all Stacks ('Lists' View)
async function fetchAndDisplayStacks() {
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/stacks`;
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = '<p>Loading lists...</p>';

    try {
        const stacks = await (await fetch(apiUrl)).json();
        updateSelectAllCheckboxState(); // Reset select-all state
        container.innerHTML = '';
        if (stacks.length === 0) {
            container.innerHTML = '<p>No lists created yet.</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'collection-list';
        stacks.forEach(stack => {
            const li = document.createElement('li');
            li.className = 'collection-item stack-item';
            li.innerHTML = `
                <input type="checkbox" class="item-checkbox" data-id="${stack.stack_id}">
                <div class="item-content clickable" title="View content of <span class="math-inline">\{stack\.stack\_name\}"\>
<p\><strong\></span>{stack.stack_name}</strong></p>
                </div>
            `;
            li.querySelector('.item-content').addEventListener('click', () => fetchAndDisplayStackContent(stack.stack_id, stack.stack_name));
            li.querySelector('.item-checkbox').addEventListener('change', (e) => handleItemSelection(e, stack.stack_id));
            ul.appendChild(li);
        });
        container.appendChild(ul);
    } catch (error) {
        console.error("Error fetching stacks:", error);
        container.innerHTML = '<p class="error-message">Error loading lists.</p>';
    }
}

// Renders the content of a single stack
async function fetchAndDisplayStackContent(stackId, stackName) {
    currentView = 'stack_content';
    selectedItems.clear();
    updateActionButtonsVisibility();

    const userId = "default-user";
    const apiUrl = `/api/v1/users/<span class="math-inline">\{userId\}/stacks/</span>{stackId}/flashcards`;
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = `<p>Loading content for <strong>${stackName}</strong>...</p>`;
    
    try {
        const items = await (await fetch(apiUrl)).json();
        updateSelectAllCheckboxState(); // Reset select-all state

        const backButton = document.createElement('button');
        backButton.textContent = '← Back to all lists';
        backButton.className = 'back-button';
        backButton.onclick = () => switchView('lists');

        const header = document.createElement('h4');
        header.textContent = `Items in "${stackName}"`;

        const ul = document.createElement('ul');
        ul.className = 'collection-list';

        if (items.length === 0) {
            ul.innerHTML = '<li>This list is empty.</li>';
        } else {
            items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'collection-item';
                li.innerHTML = `
                    <input type="checkbox" class="item-checkbox" data-id="<span class="math-inline">\{item\.flashcard\_id\}"\>
<div class\="item\-content"\><p\></span>{item.front_text}</p></div>
                `;
                li.querySelector('.item-checkbox').addEventListener('change', (e) => handleItemSelection(e, item.flashcard_id));
                ul.appendChild(li);
            });
        }
        
        container.innerHTML = '';
        container.appendChild(backButton);
        container.appendChild(header);
        container.appendChild(ul);

    } catch (error) {
        console.error(`Error fetching content for stack ${stackId}:`, error);
        container.innerHTML = '<p class="error-message">Error loading list content.</p>';
    }
}

// Renders the 'History' View
async function fetchAndDisplayHistory() {
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/collected_items`;
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = '<p>Loading history...</p>';
    
    try {
        const items = await (await fetch(apiUrl)).json();
        updateSelectAllCheckboxState(); // Reset select-all state
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = '<p>No history yet.</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'collection-list';
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'collection-item';
            const textToShow = item.is_translation ? `"<span class="math-inline">\{item\.original\_text\}" → "</span>{item.translated_text}"` : item.front_text;
            li.innerHTML = `
                <input type="checkbox" class="item-checkbox" data-id="<span class="math-inline">\{item\.flashcard\_id\}"\>
<div class\="item\-content"\>
<p\></span>{textToShow}</p>
                    <small>From: <a href="${item.source_url}" target="_blank">Source</a></small>
                </div>
            `;
            li.querySelector('.item-checkbox').addEventListener('change', (e) => handleItemSelection(e, item.flashcard_id));
            ul.appendChild(li);
        });
        container.appendChild(ul);
    } catch (error) {
        console.error("Error fetching history:", error);
        container.innerHTML = '<p class="error-message">Error loading history.</p>';
    }
}


// --- SELECTION AND DELETE LOGIC ---
function handleItemSelection(event, id) {
    const intId = parseInt(id, 10);
    if (event.target.checked) {
        selectedItems.add(intId);
    } else {
        selectedItems.delete(intId);
    }
    updateActionButtonsVisibility();
    updateSelectAllCheckboxState();
}

function updateActionButtonsVisibility() {
    const deleteButton = document.getElementById('main-delete-button');
    const addToDeckButton = document.getElementById('add-to-deck-button');
    const hasSelection = selectedItems.size > 0;

    if (deleteButton) {
        deleteButton.classList.toggle('hidden', !hasSelection);
        if (hasSelection) {
            deleteButton.textContent = `Delete (${selectedItems.size}) Selected`;
        }
    }
    if (addToDeckButton) {
        // Hide "Add to Deck" if we are in the main lists view
        addToDeckButton.classList.toggle('hidden', !hasSelection || currentView === 'lists');
        if (hasSelection) {
            addToDeckButton.textContent = `Add (${selectedItems.size}) to Deck`;
        }
    }
}

function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const allItemCheckboxes = document.querySelectorAll('#snippet-list-container .item-checkbox');
    if (!selectAllCheckbox) return;
    if (allItemCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }
    if (selectedItems.size === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedItems.size === allItemCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function handleSelectAllClick(event) {
    const allItemCheckboxes = document.querySelectorAll('#snippet-list-container .item-checkbox');
    const isChecked = event.target.checked;
    allItemCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const id = parseInt(checkbox.dataset.id, 10);
        if (isChecked) {
            selectedItems.add(id);
        } else {
            selectedItems.delete(id);
        }
    });
    updateActionButtonsVisibility();
}

async function handleDeleteSelectedClick() {
    const itemsToDelete = Array.from(selectedItems);
    if (itemsToDelete.length === 0) return;

    let confirmMessage = `Are you sure you want to delete ${itemsToDelete.length} item(s)?`;
    if (currentView === 'lists') {
        confirmMessage = `Are you sure you want to delete ${itemsToDelete.length} list(s)? This cannot be undone.`;
    }
    if (!confirm(confirmMessage)) return;

    const deletePromises = itemsToDelete.map(id => {
        const userId = "default-user";
        const endpoint = currentView === 'lists' 
            ? `/api/v1/users/<span class="math-inline">\{userId\}/stacks/</span>{id}`
            : `/api/v1/users/<span class="math-inline">\{userId\}/flashcards/</span>{id}`;
        return fetch(endpoint, { method: 'DELETE' });
    });

    try {
        await Promise.all(deletePromises);
        if (currentView === 'stack_content') {
            switchView('lists');
        } else {
            clearSelectionsAndRender();
        }
    } catch (error) {
        console.error('Failed to delete one or more items:', error);
        alert('An error occurred during deletion.');
    }
}

// --- OTHER BUTTON HANDLERS ---

function populateTextboxFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const textFromExtension = urlParams.get('text');
    const mainTextbox = document.getElementById('translate-input');
    if (textFromExtension && mainTextbox) mainTextbox.value = textFromExtension;
}

async function handleOnPageTranslate() {
    const inputElement = document.getElementById('translate-input');
    const outputElement = document.getElementById('translate-output');
    const textToTranslate = inputElement.value.trim();
    if (!textToTranslate) return;
    outputElement.value = "Translating...";
    try {
        const response = await fetch('/api/v1/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToTranslate })
        });
        if (!response.ok) throw new Error("Translation request failed.");
        const result = await response.json();
        outputElement.value = result.translated_text;
        if (currentView === 'history') renderMiddlePane();
    } catch (error) {
        console.error("On-page translation error:", error);
        outputElement.value = "Error: Could not get translation.";
    }
}

async function handleSaveClick() {
    const mainTextbox = document.getElementById('translate-input');
    const textToSave = mainTextbox.value.trim();
    if (!textToSave) return alert("Textbox is empty.");
    try {
        const stacks = await (await fetch(`/api/v1/users/default-user/stacks`)).json();
        showAddToListUI(textToSave, stacks);
    } catch (error) {
        alert("Could not fetch your lists to save to.");
    }
}

function showAddToListUI(text, stacks) {
    const existingUI = document.getElementById('add-to-list-ui');
    if (existingUI) existingUI.remove();
    const uiContainer = document.createElement('div');
    uiContainer.id = 'add-to-list-ui';
    uiContainer.className = 'action-popup';
    const select = document.createElement('select');
    if (stacks.length === 0) {
        select.innerHTML = '<option value="" disabled selected>Create a list first</option>';
    } else {
        stacks.forEach(stack => select.innerHTML += `<option value="<span class="math-inline">\{stack\.stack\_id\}"\></span>{stack.stack_name}</option>`);
    }
    const addButton = document.createElement('button');
    addButton.textContent = 'Add';
    addButton.onclick = async () => {
        if (!select.value) return alert("Please select a list.");
        const response = await fetch(`/api/v1/stacks/${select.value}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, sourceUrl: window.location.href, pageTitle: document.title })
        });
        if (response.ok) {
            alert("Item added successfully!");
            uiContainer.remove();
            if (currentView === 'history') renderMiddlePane();
        } else {
            alert("Failed to add item.");
        }
    };
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'secondary-action';
    cancelButton.onclick = () => uiContainer.remove();
    uiContainer.appendChild(select);
    uiContainer.appendChild(addButton);
    uiContainer.appendChild(cancelButton);
    const buttonGroup = document.querySelector('.manual-translate-area .button-group');
    buttonGroup.insertAdjacentElement('afterend', uiContainer);
}

async function handleCreateListClick() {
    const listName = prompt("Enter a name for your new list:");
    if (!listName || listName.trim() === '') return;
    try {
        const response = await fetch(`/api/v1/users/default-user/stacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stack_name: listName.trim() })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail);
        }
        alert(`List "${listName}" created successfully!`);
        if (currentView === 'lists') renderMiddlePane();
    } catch (error) {
        alert(`Error creating list: ${error.message}`);
    }
}

// --- FLASHCARD FEATURE LOGIC ---

async function startFlashcardSession() {
    // Activate the three-pane layout for flashcards
    document.querySelector('.dashboard-container').classList.add('flashcard-mode-active');
    const container = document.getElementById('flashcard-container');
    container.innerHTML = '<p>Loading your deck...</p>';
    
    // Fetch all items to serve as our deck of flashcards
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/collected_items`;
    
    try {
        const items = await (await fetch(apiUrl)).json();
        if (items.length === 0) {
            container.innerHTML = '<div class="flashcard-placeholder"><p>No flashcards to study. Save some items first!</p></div>';
            return;
        }
        
        // Shuffle the deck for a varied study session
        flashcardDeck = items.sort(() => Math.random() - 0.5);
        currentCardIndex = 0;
        
        // Render the first card
        renderCurrentFlashcard();

    } catch (error) {
        console.error("Failed to fetch flashcards:", error);
        container.innerHTML = '<p class="error-message">Could not load flashcards.</p>';
    }
}

function renderCurrentFlashcard() {
    const container = document.getElementById('flashcard-container');
    const card = flashcardDeck[currentCardIndex];

    // Check if the session is complete
    if (!card) {
        container.innerHTML = `
            <div class="flashcard-placeholder">
                <p>🎉 Session complete!</p>
                <button id="restart-flashcards">Study Again</button>
            </div>`;
        document.getElementById('restart-flashcards').addEventListener('click', startFlashcardSession);
        return;
    }

    const cardHTML = `
        <div class="flashcard">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <p><span class="math-inline">\{card\.front\_text\}</p\>
</div\>
<div class\="flashcard\-back"\>
<p\></span>{card.back_text || card.translated_text || "(No translation)"}</p>
                </div>
            </div>
        </div>
        <div class="flashcard-controls">
            <button id="flip-card-btn">Flip</button>
            <div id="rating-buttons" class="hidden">
                <button id="incorrect-btn" class="danger-button">Incorrect</button>
                <button id="correct-btn">Correct</button>
            </div>
        </div>
        <div class="flashcard-progress">
            Card ${currentCardIndex + 1} of ${flashcardDeck.length}
        </div>
    `;
    container.innerHTML = cardHTML;

    // Add event listeners for the new card's buttons
    const flashcardElement = document.querySelector('.flashcard');
    const flipButton = document.getElementById('flip-card-btn');
    const ratingButtons = document.getElementById('rating-buttons');

    flipButton.addEventListener('click', () => {
        flashcardElement.classList.toggle('is-flipped');
        flipButton.style.display = 'none'; // Hide flip button after flipping
        ratingButtons.classList.remove('hidden'); // Show rating buttons
    });
    
    document.getElementById('correct-btn').addEventListener('click', () => handleFlashcardReview('correct'));
    document.getElementById('incorrect-btn').addEventListener('click', () => handleFlashcardReview('incorrect'));
}

async function handleFlashcardReview(outcome) {
    const card = flashcardDeck[currentCardIndex];
    const userId = "default-user";
    
    // Send the review to the backend API endpoint
    try {
        await fetch(`/api/v1/users/<span class="math-inline">\{userId\}/flashcards/</span>{card.flashcard_id}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outcome: outcome })
        });
    } catch (error) {
        console.error("Failed to submit review:", error);
        // We still advance to the next card even if logging fails
    }

    // Move to the next card
    currentCardIndex++;
    renderCurrentFlashcard();
}

// --- PANE 3 VIEW SWITCHING ---

function switchPane3View(viewToShow) {
    // Get the view containers and buttons from the third pane
    const flashcardContainer = document.getElementById('flashcard-view-container');
    const notesContainer = document.getElementById('notes-view-container');
    const flashcardButton = document.getElementById('show-flashcard-view');
    const notesButton = document.getElementById('show-notes-view');

    // Ensure elements exist before trying to modify them
    if (flashcardContainer && notesContainer && flashcardButton && notesButton) {
        // Toggle the 'active' class on the navigation buttons
        flashcardButton.classList.toggle('active', viewToShow === 'flashcards');
        notesButton.classList.toggle('active', viewToShow === 'notes');

        // Toggle the 'hidden' class on the corresponding content containers
        flashcardContainer.classList.toggle('hidden', viewToShow !== 'flashcards');
        notesContainer.classList.toggle('hidden', viewToShow !== 'notes');
    }
}

// --- NOTES EDITOR LOGIC ---

function initializeNotesEditor() {
    const editor = document.getElementById('note-editor');
    if (!editor) return; // Exit if the editor elements are not on the current page

    // --- Formatting Buttons ---
    document.getElementById('notes-bold-btn').addEventListener('click', () => {
        document.execCommand('bold', false, null);
        editor.focus(); // Return focus to the editor after click
    });

    document.getElementById('notes-italic-btn').addEventListener('click', () => {
        document.execCommand('italic', false, null);
        editor.focus();
    });

    document.getElementById('notes-underline-btn').addEventListener('click', () => {
        document.execCommand('underline', false, null);
        editor.focus();
    });

    // --- Font Selector ---
    document.getElementById('notes-font-select').addEventListener('change', (e) => {
        const fontName = e.target.value;
        document.execCommand('fontName', false, fontName);
        editor.focus();
    });

    // --- Save Button (Phase 1: Placeholder) ---
    // This will be connected to the backend in a future step.
    // For now, it will log the content to the browser's console.
    document.getElementById('notes-save-btn').addEventListener('click', () => {
        const noteContent = editor.innerHTML;
        console.log("Note Content Saved (HTML preview):", noteContent);
        alert("Note content has been logged to the browser's console (Press F12 to view).");
    });
}