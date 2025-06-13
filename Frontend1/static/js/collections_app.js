let flashcardDeck = [];
let currentCardIndex = 0;
let currentView = 'history'; // Can be 'lists', 'history', or 'stack_content'
let selectedItems = new Set(); // Use a Set to store IDs of selected items

// --- MAIN EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners for the collections page
    document.getElementById('show-lists-view').addEventListener('click', () => switchView('lists'));
    document.getElementById('show-history-view').addEventListener('click', () => switchView('history'));
    document.getElementById('create-list-button').addEventListener('click', handleCreateListClick);
    document.getElementById('main-delete-button').addEventListener('click', handleDeleteSelectedClick);
    document.getElementById('select-all-checkbox').addEventListener('click', handleSelectAllClick);

    // Listeners for "Add to Deck" feature
    document.getElementById('add-to-deck-button').addEventListener('click', handleAddToDeckClick);
    document.getElementById('cancel-copy-btn').addEventListener('click', () => {
        document.getElementById('add-to-deck-dropdown').classList.add('hidden');
    });
    document.getElementById('confirm-copy-btn').addEventListener('click', handleConfirmCopyToDeck);
    
    // Initial setup for the collections page
    switchView(currentView); // Start on the history view
    populateDeckSelectorMenu(); // Populate the study deck dropdown
});


// --- FEATURE LOGIC ---

async function handleAddToDeckClick() {
    const dropdown = document.getElementById('add-to-deck-dropdown');
    const isHidden = dropdown.classList.contains('hidden');

    if (!isHidden) {
        dropdown.classList.add('hidden');
        return;
    }

    const select = document.getElementById('dest-deck-select');
    select.innerHTML = '<option>Loading decks...</option>';

    try {
        const userId = "default-user";
        const stacks = await (await fetch(`/api/v1/users/${userId}/stacks`)).json();

        let optionsHTML = '<option value="" disabled selected>Choose a deck...</option>';
        if (stacks.length > 0) {
            stacks.forEach(stack => {
                optionsHTML += `<option value="${stack.stack_id}">${stack.stack_name}</option>`;
            });
        } else {
            optionsHTML = '<option value="" disabled>No decks found</option>';
        }
        select.innerHTML = optionsHTML;
        dropdown.classList.remove('hidden');
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
        dropdown.classList.add('hidden');
        clearSelectionsAndRender();
    } catch (error) {
        alert(`Error copying items: ${error.message}`);
    }
}

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
                    dropdown.classList.add('hidden');
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

async function startDeckStudySession(deckId, deckName) {
    const container = document.getElementById('flashcard-container');
    container.innerHTML = `<p>Loading deck: <strong>${deckName}</strong>...</p>`;

    try {
        const userId = "default-user";
        const apiUrl = `/api/v1/users/${userId}/stacks/${deckId}/flashcards`;
        const items = await (await fetch(apiUrl)).json();

        if (items.length === 0) {
            container.innerHTML = `<div class="flashcard-placeholder"><p>This deck is empty. Add some cards!</p></div>`;
            return;
        }

        flashcardDeck = items.sort(() => Math.random() - 0.5);
        currentCardIndex = 0;
        renderCurrentFlashcard();

    } catch (error) {
        console.error(`Failed to fetch flashcards for deck ${deckId}:`, error);
        container.innerHTML = '<p class="error-message">Could not load this deck.</p>';
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
    if (currentView === 'lists') {
        fetchAndDisplayStacks();
    } else if (currentView === 'history') {
        fetchAndDisplayHistory();
    }
}

function clearSelectionsAndRender() {
    selectedItems.clear();
    updateActionButtonsVisibility();
    updateSelectAllCheckboxState();
    renderMiddlePane();
}

// --- FLASHCARD FEATURE LOGIC ---

function renderCurrentFlashcard() {
    const container = document.getElementById('flashcard-container');
    const card = flashcardDeck[currentCardIndex];

    if (!card) {
        container.innerHTML = `
            <div class="flashcard-placeholder">
                <p>🎉 Session complete!</p>
                <button id="restart-flashcards">Study Again</button>
            </div>`;
        document.getElementById('restart-flashcards').addEventListener('click', () => startDeckStudySession(card.stack_id, "this deck"));
        return;
    }

    const cardHTML = `
        <div class="flashcard">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <p>${card.front_text}</p>
                </div>
                <div class="flashcard-back">
                    <p>${card.back_text || "(No back text)"}</p>
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

    const flashcardElement = document.querySelector('.flashcard');
    const flipButton = document.getElementById('flip-card-btn');
    const ratingButtons = document.getElementById('rating-buttons');

    flipButton.addEventListener('click', () => {
        flashcardElement.classList.toggle('is-flipped');
        flipButton.style.display = 'none';
        ratingButtons.classList.remove('hidden');
    });
    
    document.getElementById('correct-btn').addEventListener('click', () => handleFlashcardReview('correct'));
    document.getElementById('incorrect-btn').addEventListener('click', () => handleFlashcardReview('incorrect'));
}

async function handleFlashcardReview(outcome) {
    const card = flashcardDeck[currentCardIndex];
    const userId = "default-user";
    
    try {
        await fetch(`/api/v1/users/${userId}/flashcards/${card.flashcard_id}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outcome: outcome })
        });
    } catch (error) {
        console.error("Failed to submit review:", error);
    }

    currentCardIndex++;
    renderCurrentFlashcard();
}

// --- RENDERING SPECIFIC VIEWS ---
async function fetchAndDisplayStacks() {
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/stacks`;
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = '<p>Loading lists...</p>';

    try {
        const stacks = await (await fetch(apiUrl)).json();
        updateSelectAllCheckboxState();
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
                <div class="item-content clickable" title="View content of ${stack.stack_name}">
                    <p><strong>${stack.stack_name}</strong></p>
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

async function fetchAndDisplayStackContent(stackId, stackName) {
    currentView = 'stack_content';
    selectedItems.clear();
    updateActionButtonsVisibility();

    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/stacks/${stackId}/flashcards`;
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = `<p>Loading content for <strong>${stackName}</strong>...</p>`;
    
    try {
        const items = await (await fetch(apiUrl)).json();
        updateSelectAllCheckboxState();

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
                    <input type="checkbox" class="item-checkbox" data-id="${item.flashcard_id}">
                    <div class="item-content"><p>${item.front_text}</p></div>
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

async function fetchAndDisplayHistory() {
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/collected_items`;
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = '<p>Loading history...</p>';
    
    try {
        const items = await (await fetch(apiUrl)).json();
        updateSelectAllCheckboxState();
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
            const textToShow = item.is_translation ? `"${item.original_text}" → "${item.translated_text}"` : item.front_text;
            li.innerHTML = `
                <input type="checkbox" class="item-checkbox" data-id="${item.flashcard_id}">
                <div class="item-content">
                    <p>${textToShow}</p>
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
            ? `/api/v1/users/${userId}/stacks/${id}`
            : `/api/v1/users/${userId}/flashcards/${id}`;
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