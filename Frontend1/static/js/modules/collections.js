// State and constants scoped to the Collections module
let currentView = 'history';
let selectedItems = new Set();
const API_BASE_URL = '/api/v1';
const USER_ID = 'default-user';

// The main initializer function that the main app will call
export function initializeCollectionsFeature() {
    // Attach all event listeners for this feature
    document.getElementById('show-lists-view').addEventListener('click', () => switchView('lists'));
    document.getElementById('show-history-view').addEventListener('click', () => switchView('history'));
    document.getElementById('create-list-button').addEventListener('click', handleCreateListClick);
    document.getElementById('main-delete-button').addEventListener('click', handleDeleteSelectedClick);
    document.getElementById('select-all-checkbox').addEventListener('click', handleSelectAllClick);

    // Initial render of the middle pane
    renderMiddlePane();
}

// --- All Collections-specific functions are moved here ---

function switchView(view) {
    // This function now manages the state within this module
    currentView = view;
    document.getElementById('show-lists-view').classList.toggle('active', view === 'lists');
    document.getElementById('show-history-view').classList.toggle('active', view === 'history');
    document.getElementById('create-list-button').style.display = (view === 'lists') ? 'inline-block' : 'none';
    clearSelectionsAndRender();
}

function renderMiddlePane() {
    if (currentView === 'lists') fetchAndDisplayStacks();
    else if (currentView === 'history') fetchAndDisplayHistory();
}

function clearSelectionsAndRender() {
    selectedItems.clear();
    updateActionButtonsVisibility();
    updateSelectAllCheckboxState();
    renderMiddlePane();
}

async function fetchAndDisplayStacks() {
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = '<p>Loading lists...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/stacks`);
        const stacks = await response.json();
        container.innerHTML = '';
        if (stacks.length === 0) { container.innerHTML = '<p>No lists created yet.</p>'; return; }
        const ul = document.createElement('ul');
        ul.className = 'collection-list';
        stacks.forEach(stack => {
            const li = document.createElement('li');
            li.className = 'collection-item stack-item';
            li.innerHTML = `<input type="checkbox" class="item-checkbox" data-id="${stack.stack_id}"><div class="item-content clickable"><p><strong>${stack.stack_name}</strong></p></div>`;
            li.querySelector('.item-content').addEventListener('click', () => fetchAndDisplayStackContent(stack.stack_id, stack.stack_name));
            li.querySelector('.item-checkbox').addEventListener('change', (e) => handleItemSelection(e, stack.stack_id));
            ul.appendChild(li);
        });
        container.appendChild(ul);
    } catch (error) { container.innerHTML = '<p class="error-message">Error loading lists.</p>'; }
}

async function fetchAndDisplayHistory() {
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = '<p>Loading history...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/collected_items`);
        const items = await response.json();
        container.innerHTML = '';
        if (items.length === 0) { container.innerHTML = '<p>No history yet.</p>'; return; }
        const ul = document.createElement('ul');
        ul.className = 'collection-list';
        items.forEach(item => {
            const textToShow = item.is_translation ? `"${item.original_text}" → "${item.front_text}"` : item.front_text;
            const li = document.createElement('li');
            li.className = 'collection-item';
            li.innerHTML = `<input type="checkbox" class="item-checkbox" data-id="${item.flashcard_id}"><div class="item-content"><p>${textToShow}</p><small>From: <a href="${item.source_url}" target="_blank">Source</a></small></div>`;
            li.querySelector('.item-checkbox').addEventListener('change', (e) => handleItemSelection(e, item.flashcard_id));
            ul.appendChild(li);
        });
        container.appendChild(ul);
    } catch (error) { container.innerHTML = '<p class="error-message">Error loading history.</p>'; }
}

async function fetchAndDisplayStackContent(stackId, stackName) {
    currentView = 'stack_content';
    selectedItems.clear();
    updateActionButtonsVisibility();
    const container = document.getElementById('snippet-list-container');
    container.innerHTML = `<p>Loading content for <strong>${stackName}</strong>...</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/stacks/${stackId}/flashcards`);
        const items = await response.json();
        const backButton = `<button class="back-button" onclick="document.getElementById('show-lists-view').click()">← Back to all lists</button>`;
        let listHTML = `<h4>Items in "${stackName}"</h4><ul class="collection-list">`;
        if (items.length === 0) {
            listHTML += '<li>This list is empty.</li>';
        } else {
            items.forEach(item => {
                listHTML += `<li class="collection-item"><input type="checkbox" class="item-checkbox" data-id="${item.flashcard_id}"><div class="item-content"><p>${item.front_text}</p></div></li>`;
            });
        }
        listHTML += `</ul>`;
        container.innerHTML = backButton + listHTML;
        container.querySelectorAll('.item-checkbox').forEach(cb => cb.addEventListener('change', (e) => handleItemSelection(e, cb.dataset.id)));
    } catch (error) { container.innerHTML = '<p class="error-message">Error loading list content.</p>'; }
}

async function handleCreateListClick() {
    const listName = prompt("Enter a name for your new list:");
    if (!listName || !listName.trim()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/stacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stack_name: listName.trim() })
        });
        if (!response.ok) throw new Error((await response.json()).detail);
        alert(`List "${listName}" created!`);
        if (currentView === 'lists') renderMiddlePane();
    } catch (error) { alert(`Error: ${error.message}`); }
}

function handleItemSelection(event, id) {
    const intId = parseInt(id, 10);
    if (event.target.checked) selectedItems.add(intId); else selectedItems.delete(intId);
    updateActionButtonsVisibility();
    updateSelectAllCheckboxState();
}

function updateActionButtonsVisibility() {
    const deleteBtn = document.getElementById('main-delete-button');
    const hasSelection = selectedItems.size > 0;
    deleteBtn.classList.toggle('hidden', !hasSelection);
    if (hasSelection) deleteBtn.textContent = `Delete (${selectedItems.size})`;
}

function updateSelectAllCheckboxState() {
    const selectAll = document.getElementById('select-all-checkbox');
    const allCheckboxes = document.querySelectorAll('#snippet-list-container .item-checkbox');
    if (allCheckboxes.length === 0) { selectAll.checked = false; selectAll.indeterminate = false; return; }
    if (selectedItems.size === 0) { selectAll.checked = false; selectAll.indeterminate = false; }
    else if (selectedItems.size === allCheckboxes.length) { selectAll.checked = true; selectAll.indeterminate = false; }
    else { selectAll.checked = false; selectAll.indeterminate = true; }
}

function handleSelectAllClick(event) {
    const checkboxes = document.querySelectorAll('#snippet-list-container .item-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = event.target.checked;
        handleItemSelection({ target: checkbox }, checkbox.dataset.id);
    });
}

async function handleDeleteSelectedClick() {
    if (selectedItems.size === 0) return;
    const confirmMessage = currentView === 'lists'
        ? `Delete ${selectedItems.size} list(s)? This deletes all flashcards inside.`
        : `Delete ${selectedItems.size} item(s)?`;
    if (!confirm(confirmMessage)) return;

    const deletePromises = Array.from(selectedItems).map(id => {
        const endpoint = currentView === 'lists' ? `${API_BASE_URL}/users/${USER_ID}/stacks/${id}` : `${API_BASE_URL}/users/${USER_ID}/flashcards/${id}`;
        return fetch(endpoint, { method: 'DELETE' });
    });

    try {
        await Promise.all(deletePromises);
        if (currentView === 'stack_content') switchView('lists'); else clearSelectionsAndRender();
    } catch (error) { alert('An error occurred during deletion.'); }
}