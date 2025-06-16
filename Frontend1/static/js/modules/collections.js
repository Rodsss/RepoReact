//
// FILE: Frontend1/static/js/modules/collections.js (State-Driven Refactor)
//
let state = null;
let renderApp = null;
const API_BASE_URL = '/api/v1';

// --- State Initializer ---
function initializeState() {
    if (!state.collections) {
        state.collections = {
            view: 'history', // 'lists', 'history', or 'stack_content'
            items: [],
            selectedItems: new Set(),
            activeStackName: null,
            isLoading: true
        };
    }
}

// --- Component Functions ---

function StackItemComponent(stack) {
    const isSelected = state.collections.selectedItems.has(stack.stack_id);
    return `
        <li class="collection-item stack-item">
            <input type="checkbox" class="item-checkbox" data-id="${stack.stack_id}" data-type="stack" ${isSelected ? 'checked' : ''}>
            <div class="item-content clickable" data-id="${stack.stack_id}">
                <p><strong>${stack.stack_name}</strong></p>
            </div>
        </li>
    `;
}

function HistoryItemComponent(item) {
    const isSelected = state.collections.selectedItems.has(item.flashcard_id);
    const textToShow = item.is_translation ? `"${item.original_text}" → "${item.front_text}"` : item.front_text;
    return `
        <li class="collection-item">
            <input type="checkbox" class="item-checkbox" data-id="${item.flashcard_id}" data-type="flashcard" ${isSelected ? 'checked' : ''}>
            <div class="item-content">
                <p>${textToShow}</p>
                <small>From: <a href="${item.source_url}" target="_blank" rel="noopener noreferrer">Source</a></small>
            </div>
        </li>
    `;
}

function StackContentItemComponent(item) {
    const isSelected = state.collections.selectedItems.has(item.flashcard_id);
    return `
        <li class="collection-item">
            <input type="checkbox" class="item-checkbox" data-id="${item.flashcard_id}" data-type="flashcard" ${isSelected ? 'checked' : ''}>
            <div class="item-content">
                <p>${item.front_text}</p>
            </div>
        </li>
    `;
}

// --- Main Rendering Logic ---

export function renderCollections() {
    const container = document.getElementById('snippet-list-container');
    const header = document.querySelector('.dashboard-pane.pane-middle .pane-header');
    if (!container || !header) return;

    // Render Header
    header.querySelector('#show-lists-view').classList.toggle('active', state.collections.view === 'lists');
    header.querySelector('#show-history-view').classList.toggle('active', state.collections.view === 'history');
    header.querySelector('#create-list-button').style.display = (state.collections.view === 'lists') ? 'inline-block' : 'none';
    const deleteBtn = header.querySelector('#main-delete-button');
    deleteBtn.classList.toggle('hidden', state.collections.selectedItems.size === 0);
    deleteBtn.textContent = `Delete (${state.collections.selectedItems.size})`;

    // Render Content
    if (state.collections.isLoading) {
        container.innerHTML = '<p>Loading...</p>';
        return;
    }

    let contentHTML = '';
    if (state.collections.view === 'stack_content') {
        contentHTML += `<button class="btn-base btn-custom-outline mb-2" data-action="back-to-lists">← Back to all lists</button>`;
        contentHTML += `<h4>Items in "${state.collections.activeStackName}"</h4>`;
    }

    if (state.collections.items.length === 0) {
        contentHTML += '<p>Nothing to show here.</p>';
    } else {
        const itemRenderer = {
            'lists': StackItemComponent,
            'history': HistoryItemComponent,
            'stack_content': StackContentItemComponent
        }[state.collections.view];
        contentHTML += `<ul class="collection-list">${state.collections.items.map(itemRenderer).join('')}</ul>`;
    }
    container.innerHTML = contentHTML;
}

// --- Event Handling and State Changes ---

export function initializeCollectionsFeature(appState, mainRenderCallback) {
    state = appState;
    renderApp = mainRenderCallback;
    initializeState();
    
    document.querySelector('.dashboard-pane.pane-middle').addEventListener('click', handleCollectionEvents);
    
    // Initial data fetch
    fetchHistory();
}

async function handleCollectionEvents(event) {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;

    if (event.target.id === 'show-lists-view') switchView('lists');
    else if (event.target.id === 'show-history-view') switchView('history');
    else if (event.target.id === 'create-list-button') await handleCreateListClick();
    else if (event.target.id === 'main-delete-button') await handleDeleteSelectedClick();
    else if (event.target.id === 'select-all-checkbox') handleSelectAllClick(event.target.checked);
    else if (event.target.classList.contains('item-checkbox')) handleItemSelection(event.target.checked, parseInt(id, 10));
    else if (event.target.closest('.item-content.clickable')) handleStackClick(parseInt(event.target.closest('.item-content').dataset.id, 10));
    else if (action === 'back-to-lists') switchView('lists');
}

function switchView(view) {
    state.collections.view = view;
    state.collections.selectedItems.clear();
    if (view === 'lists') fetchStacks();
    else if (view === 'history') fetchHistory();
}

async function fetchStacks() {
    state.collections.isLoading = true;
    renderApp();
    try {
        const response = await fetch(`${API_BASE_URL}/users/${state.userId}/stacks`);
        state.collections.items = await response.json();
    } catch (e) { console.error(e); state.collections.items = []; }
    state.collections.isLoading = false;
    renderApp();
}

async function fetchHistory() {
    state.collections.isLoading = true;
    renderApp();
    try {
        const response = await fetch(`${API_BASE_URL}/users/${state.userId}/collected_items`);
        state.collections.items = await response.json();
    } catch (e) { console.error(e); state.collections.items = []; }
    state.collections.isLoading = false;
    renderApp();
}

async function handleStackClick(stackId) {
    state.collections.view = 'stack_content';
    state.collections.isLoading = true;
    renderApp();
    try {
        const stack = state.collections.items.find(s => s.stack_id === stackId);
        state.collections.activeStackName = stack ? stack.stack_name : '';
        const response = await fetch(`${API_BASE_URL}/users/${state.userId}/stacks/${stackId}/flashcards`);
        state.collections.items = await response.json();
    } catch (e) { console.error(e); state.collections.items = []; }
    state.collections.isLoading = false;
    renderApp();
}

async function handleCreateListClick() {
    const listName = prompt("Enter a name for your new list:");
    if (!listName || !listName.trim()) return;
    try {
        await fetch(`${API_BASE_URL}/users/${state.userId}/stacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stack_name: listName.trim() })
        });
        fetchStacks(); // Refetch the list to update the view
    } catch (error) { alert(`Error: ${error.message}`); }
}

function handleItemSelection(isChecked, id) {
    if (isChecked) state.collections.selectedItems.add(id);
    else state.collections.selectedItems.delete(id);
    renderApp();
}

function handleSelectAllClick(isChecked) {
    state.collections.selectedItems.clear();
    if (isChecked) {
        const type = state.collections.view === 'lists' ? 'stack_id' : 'flashcard_id';
        state.collections.items.forEach(item => state.collections.selectedItems.add(item[type]));
    }
    renderApp();
}

async function handleDeleteSelectedClick() {
    const { selectedItems, view } = state.collections;
    if (selectedItems.size === 0) return;
    const confirmMessage = view === 'lists'
        ? `Delete ${selectedItems.size} list(s)? This deletes all flashcards inside.`
        : `Delete ${selectedItems.size} item(s)?`;
    if (!confirm(confirmMessage)) return;

    const endpointType = view === 'lists' ? 'stacks' : 'flashcards';
    const deletePromises = Array.from(selectedItems).map(id => {
        return fetch(`${API_BASE_URL}/users/${state.userId}/${endpointType}/${id}`, { method: 'DELETE' });
    });

    try {
        await Promise.all(deletePromises);
        state.collections.selectedItems.clear();
        if (view === 'lists') fetchStacks();
        else if (view === 'history') fetchHistory();
        else switchView('lists');
    } catch (error) { alert('An error occurred during deletion.'); }
}