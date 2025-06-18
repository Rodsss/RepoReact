//
// FILE: Frontend1/static/js/modules/collections.js (Consolidated and Final)
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
            activeStackId: null,
            activeStackName: null,
            isLoading: true
        };
    }
}

// --- Component Rendering Functions ---

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
        contentHTML += `<div class="stack-content-header"><button class="btn-base btn-custom-outline mb-2" data-action="back-to-lists">← Back</button><h4>${state.collections.activeStackName}</h4></div>`;
        
        let createDeckButton = document.getElementById('create-deck-from-list-button');
        if (!createDeckButton) {
            createDeckButton = document.createElement('button');
            createDeckButton.id = 'create-deck-from-list-button';
            createDeckButton.className = 'button full-width mt-2';
            createDeckButton.textContent = 'Create Deck from This List';
            container.insertAdjacentElement('afterend', createDeckButton);
        }
    } else {
         const createDeckButton = document.getElementById('create-deck-from-list-button');
         if (createDeckButton) createDeckButton.remove();
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
    document.body.addEventListener('click', handleCollectionEvents); // For button outside main container
    
    fetchHistory();
}

async function handleCollectionEvents(event) {
    const target = event.target;
    const action = target.dataset.action;
    const id = target.dataset.id;
    
    const viewButtons = {
        'show-lists-view': 'lists',
        'show-history-view': 'history'
    };

    if (viewButtons[target.id]) switchView(viewButtons[target.id]);
    else if (target.id === 'create-list-button') await handleCreateListClick();
    else if (target.id === 'main-delete-button') await handleDeleteSelectedClick();
    else if (target.id === 'select-all-checkbox') handleSelectAllClick(target.checked);
    else if (target.id === 'create-deck-from-list-button') await handleCreateDeckClick();
    else if (target.classList.contains('item-checkbox')) handleItemSelection(target.checked, parseInt(id, 10));
    else if (target.closest('.item-content.clickable')) handleStackClick(parseInt(target.closest('.item-content').dataset.id, 10));
    else if (action === 'back-to-lists') switchView('lists');
}

function switchView(view) {
    state.collections.view = view;
    state.collections.selectedItems.clear();
    state.collections.activeStackId = null;
    state.collections.activeStackName = null;
    if (view === 'lists') fetchStacks();
    else if (view === 'history') fetchHistory();
}

async function fetchGeneric(url, property) {
    state.collections.isLoading = true;
    renderApp();
    try {
        const response = await fetch(url);
        state.collections[property] = await response.json();
    } catch (e) {
        console.error(e);
        state.collections[property] = [];
    }
    state.collections.isLoading = false;
    renderApp();
}

const fetchStacks = () => fetchGeneric(`${API_BASE_URL}/users/${state.userId}/stacks`, 'items');
const fetchHistory = () => fetchGeneric(`${API_BASE_URL}/users/${state.userId}/collected_items`, 'items');

async function handleStackClick(stackId) {
    const stack = state.collections.items.find(s => s.stack_id === stackId);
    state.collections.activeStackId = stackId;
    state.collections.activeStackName = stack ? stack.stack_name : '';
    state.collections.view = 'stack_content';
    await fetchGeneric(`${API_BASE_URL}/users/${state.userId}/stacks/${stackId}/flashcards`, 'items');
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
        fetchStacks();
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
    const deletePromises = Array.from(selectedItems).map(id => 
        fetch(`${API_BASE_URL}/users/${state.userId}/${endpointType}/${id}`, { method: 'DELETE' })
    );

    try {
        await Promise.all(deletePromises);
        state.collections.selectedItems.clear();
        if (view === 'lists' || view === 'stack_content') fetchStacks();
        else if (view === 'history') fetchHistory();
    } catch (error) { alert('An error occurred during deletion.'); }
}

async function handleCreateDeckClick() {
    const deckName = prompt("Please enter a name for the new flashcard deck:", state.collections.activeStackName || "New Deck");
    if (!deckName) return;

    const itemsForDeck = state.collections.items.map(item => ({ text: item.front_text }));
    if (itemsForDeck.length === 0) return alert("There are no items in this list to create a deck from.");
    
    try {
        const response = await fetch(`${API_BASE_URL}/flashcard-decks-from-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deck_name: deckName, items: itemsForDeck })
        });
        if (!response.ok) throw new Error("Failed to create deck.");

        const newDeck = await response.json();
        if (!state.flashcards) state.flashcards = {};
        if (!state.flashcards.decks) state.flashcards.decks = [];
        state.flashcards.decks.push(newDeck);
        
        renderApp();
        alert(`Successfully created deck "${deckName}"!`);
    } catch (error) {
        console.error("Error creating deck:", error);
        alert("Could not create deck.");
    }
}