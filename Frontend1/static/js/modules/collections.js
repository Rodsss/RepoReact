//
// FILE: Frontend1/static/js/modules/collections.js (Final Consolidated Version)
//
import { fetchWithAuth } from '../services/apiService.js';

let state = null;
let renderApp = null;

// --- State Initializer ---
function initializeState() {
    if (!state.collections) {
        state.collections = {
            lists: [],
            isLoading: true,
            error: null,
            isCreatorVisible: false,
        };
    }
    if (!state.modal) {
        state.modal = {
            isSaveToListVisible: false,
        };
    }
    // NEW: State for the list options context menu
    if (!state.listOptionsMenu) {
        state.listOptionsMenu = {
            isVisible: false,
            top: 0,
            left: 0,
            listId: null
        };
    }
}


// --- Component Renderers ---

// This component renders the main list view in Pane 2
export function CollectionsComponent() {
    if (state.collections.isLoading && state.collections.lists.length === 0) {
        return "<p>Loading lists...</p>";
    }
    if (state.collections.error) {
        return `<p style="padding: 15px; color: #e94560;">${state.collections.error}</p>`;
    }

    const listsHtml = state.collections.lists.length > 0
        ? state.collections.lists.map(list => `
            <div class="list-item-container">
                <button class="list-item-button" data-action="select-list" data-stack-id="${list.stack_id}">
                    ${list.stack_name}
                </button>
                <button class="icon-button list-options-btn" data-action="open-list-options" data-stack-id="${list.stack_id}" title="More options">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
            </div>
        `).join('')
        : "<p style=\"padding: 15px; color: #6a7183;\">No lists found. Click the '+' icon to create one.</p>";

    const creatorVisibilityClass = state.collections.isCreatorVisible ? "" : "hidden";
    const creatorHtml = `
        <div id="new-list-container" class="input-container ${creatorVisibilityClass}">
            <input type="text" id="new-list-input" placeholder="New list name..." />
        </div>
    `;

    return listsHtml + creatorHtml;
}

// This component renders the content for the "Save to List" modal
export function ModalListsComponent() {
    if (state.collections.isLoading) {
        return '<p>Loading lists...</p>';
    }
    if (state.collections.lists.length === 0) {
        return '<p>No lists found. Create one in the main view.</p>';
    }
    return state.collections.lists
        .map(
            (list) =>
                `<button class="modal-list-item" data-action="save-to-list" data-stack-id="${list.stack_id}">${list.stack_name}</button>`
        )
        .join('');
}


// --- Event Handling and Feature Initialization ---

export function initializeCollectionsFeature(appState, mainRenderCallback) {
    state = appState;
    renderApp = mainRenderCallback;
    initializeState();

    const collectionsPane = document.getElementById('pane-two-content'); // Assuming a container ID
    if (collectionsPane) {
        collectionsPane.addEventListener('click', handleDelegatedEvents);
        collectionsPane.addEventListener('keydown', handleDelegatedEvents);
    }

    fetchLists();
}

async function handleDelegatedEvents(event) {
    if (event.type === 'keydown' && event.key === 'Enter' && event.target.id === 'new-list-input') {
        event.preventDefault();
        const newListName = event.target.value.trim();
        if (newListName) {
            await createNewList(newListName);
        }
        return;
    }

    if (event.type !== 'click') return;
    const action = event.target.dataset.action || event.target.closest('[data-action]')?.dataset.action;

    switch (action) {
        case "toggle-list-creator":
            state.collections.isCreatorVisible = !state.collections.isCreatorVisible;
            renderApp();
            if (state.collections.isCreatorVisible) {
                setTimeout(() => document.getElementById("new-list-input")?.focus(), 0);
            }
            break;
        case "select-list":
            console.log("Selected list with ID:", event.target.dataset.stackId);
            break;
        case 'open-list-options':
            const listId = event.target.closest('[data-stack-id]').dataset.stackId;
            openListOptionsMenu(event, parseInt(listId, 10));
            break;
        case 'delete-list':
            deleteList(state.listOptionsMenu.listId);
            break;
        case 'rename-list':
            // Placeholder for future rename functionality
            renameList(state.listOptionsMenu.listId);
            break;
    }
}


// --- Actions ---

export async function openSaveToListModal() {
    const textToSave = document.getElementById('source-text')?.textContent?.trim();
    if (!textToSave) {
        alert('There is no text to save.');
        return;
    }
    state.modal.isSaveToListVisible = true;
    state.collections.isLoading = true;
    renderApp();
    await fetchLists();
    state.collections.isLoading = false;
    renderApp();
}

export function closeModal() {
    state.modal.isSaveToListVisible = false;
    renderApp();
}

export async function saveItemToStack(stackId) {
    const textToSave = document.getElementById('source-text').textContent.trim();
    if (!textToSave) return;
    try {
        await fetchWithAuth(`/stacks/${stackId}/items`, {
            method: 'POST',
            body: JSON.stringify({ text: textToSave }),
        });
        alert(`Saved to list successfully!`);
        closeModal();
    } catch (error) {
        alert("Error: Could not save the item.");
    }
}

export function openListOptionsMenu(event, listId) {
    const rect = event.target.getBoundingClientRect();
    state.listOptionsMenu.isVisible = true;
    state.listOptionsMenu.top = rect.bottom + window.scrollY;
    state.listOptionsMenu.left = rect.left - 150 + rect.width; // Position menu to the left of the button
    state.listOptionsMenu.listId = listId;
    renderApp();
}

export function closeListOptionsMenu() {
    if (state.listOptionsMenu.isVisible) {
        state.listOptionsMenu.isVisible = false;
        renderApp();
    }
}

export async function deleteList(listId) {
    if (!listId) return;
    if (confirm("Are you sure you want to delete this list and all its contents?")) {
        try {
            await fetchWithAuth(`/stacks/${listId}`, { method: 'DELETE' });
            await fetchLists(); // Refetch to update the UI
        } catch (error) {
            alert("Error: Could not delete the list.");
        }
    }
    closeListOptionsMenu();
}

async function renameList(listId) {
    if (!listId) return;
    const currentList = state.collections.lists.find(l => l.stack_id === listId);
    const newName = prompt("Enter a new name for the list:", currentList.stack_name);

    if (newName && newName.trim() !== "") {
        // This requires a new backend endpoint: PUT /stacks/{stack_id}
        console.log(`Placeholder: Would rename list ${listId} to "${newName}"`);
        // await fetchWithAuth(`/stacks/${listId}`, { method: 'PUT', body: JSON.stringify({ stack_name: newName.trim() }) });
        // await fetchLists();
    }
    closeListOptionsMenu();
}

async function fetchLists() {
    state.collections.isLoading = true;
    try {
        const lists = await fetchWithAuth(`/users/${state.userId}/stacks`);
        lists.sort((a, b) => a.stack_name.localeCompare(b.stack_name));
        state.collections.lists = lists;
        state.collections.error = null;
    } catch (error) {
        state.collections.error = "Error loading lists.";
    }
    state.collections.isLoading = false;
    renderApp();
}

async function createNewList(listName) {
    try {
        await fetchWithAuth("/stacks", {
            method: "POST",
            body: JSON.stringify({ stack_name: listName }),
        });
        state.collections.isCreatorVisible = false;
        document.getElementById('new-list-input').value = '';
        await fetchLists();
    } catch (error) {
        alert("Error: Could not create the new list.");
    }
}