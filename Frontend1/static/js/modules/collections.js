// Using a mock fetch for design purposes. Replace with your actual apiService import.
const fetchWithAuth = async (endpoint, options) => {
    console.log(`Fetching (mock): ${endpoint}`, options);
    if (endpoint === '/collections/stacks' && options?.method === 'POST') {
        return Promise.resolve({ success: true });
    }
    if (endpoint === '/collections/stacks') {
        return Promise.resolve([
            { stack_id: 1, stack_name: 'My First List' },
            { stack_id: 2, stack_name: 'Spanish Verbs' }
        ]);
    }
    if (endpoint.includes('/stacks/')) {
        return Promise.resolve([{ text: 'Hola' }, { text: 'Mundo' }]);
    }
    return Promise.resolve([]);
};

let state = null;
let renderApp = null;
let collectionsContainer = null;
let backButton = null;

// --- Initialization ---
export function initializeCollectionsFeature(appState, mainRenderCallback) {
    state = appState;
    renderApp = mainRenderCallback;
    
    if (!state.collections) {
        state.collections = {
            view: 'all-lists',
            lists: [],
            currentListId: null,
            currentListWords: []
        };
    }

    collectionsContainer = document.getElementById('collections-container');
    backButton = document.querySelector('.pane-two .back-button');

    const paneTwo = document.querySelector('.pane-two');
    if (paneTwo) {
        paneTwo.addEventListener('click', handlePaneEvents);
    }

    // --- NEW: Add event listener for the input box ---
    const newListInput = document.getElementById('new-list-input');
    if (newListInput) {
        newListInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission
                handleSaveNewList();
            }
        });
    }

    fetchLists();
}

// --- Main Render Function ---
export function renderCollections() {
    if (!collectionsContainer || !state.collections) return;
    if (state.collections.view === 'all-lists') {
        renderAllListsView();
    } else if (state.collections.view === 'single-list') {
        renderSingleListView();
    }
}

// --- Event Handling ---
function handlePaneEvents(event) {
    const target = event.target;
    const listItem = target.closest('.list-item-button');
    if (listItem) {
        viewSingleList(listItem.dataset.listId);
        return;
    }
    if (target.closest('.back-button')) {
        viewAllLists();
        return;
    }
    if (target.closest('.action-button[title="Create new list"]')) {
        toggleNewListBox(true);
        return;
    }
}

// --- State and View Changers ---
function viewAllLists() {
    state.collections.view = 'all-lists';
    backButton.classList.add('hidden');
    renderCollections();
}

async function viewSingleList(listId) {
    state.collections.view = 'single-list';
    state.collections.currentListId = listId;
    backButton.classList.remove('hidden');
    try {
        state.collections.currentListWords = await fetchWithAuth(`/collections/stacks/${listId}/flashcards`);
    } catch (error) {
        state.collections.currentListWords = [];
    }
    renderCollections();
}

function toggleNewListBox(show) {
    const container = document.getElementById('new-list-container');
    const input = document.getElementById('new-list-input');
    if (show) {
        container.classList.add('visible');
        input.focus();
    } else {
        container.classList.remove('visible');
    }
}

async function handleSaveNewList() {
    const input = document.getElementById('new-list-input');
    const newListName = input.value.trim();
    if (!newListName) {
        toggleNewListBox(false); // Hide box if input is empty
        return;
    }

    try {
        await fetchWithAuth('/collections/stacks', {
            method: 'POST',
            body: JSON.stringify({ stack_name: newListName })
        });
        input.value = '';
        toggleNewListBox(false);
        await fetchLists(); // Refetch lists to show the new one
    } catch (error) {
        alert("Failed to create list.");
    }
}

// --- Data Fetching ---
async function fetchLists() {
    try {
        state.collections.lists = await fetchWithAuth('/collections/stacks');
    } catch (error) {
        state.collections.lists = [];
    }
    renderCollections();
}

// --- DOM Rendering ---
function renderAllListsView() {
    collectionsContainer.innerHTML = state.collections.lists.length === 0
        ? `<p style="padding: 10px;">No lists found. Create one with the '+' button!</p>`
        : state.collections.lists.map(list => `
            <button class="list-item-button" data-list-id="${list.stack_id}">
                ${list.stack_name}
            </button>
        `).join('');
}

function renderSingleListView() {
    collectionsContainer.innerHTML = state.collections.currentListWords.length === 0
        ? `<p style="padding: 10px;">This list is empty.</p>`
        : state.collections.currentListWords.map(word => `<div class="word-item">${word.text}</div>`).join('');
}

// Add a simple style for the word items once
const wordItemStyle = document.createElement('style');
wordItemStyle.innerHTML = `.word-item { padding: 12px 10px; border-bottom: 1px solid var(--border-color); }`;
document.head.appendChild(wordItemStyle);