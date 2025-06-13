// ===================================================================================
//  GLOBAL STATE & CONFIG
// ===================================================================================
let flashcardDeck = [];
let currentCardIndex = 0;
let currentNoteId = null;
let currentFolderId = null;
let currentView = 'history'; // Default middle-pane view
let selectedItems = new Set();
const API_BASE_URL = '/api/v1';
const USER_ID = 'default-user';


// ===================================================================================
//  MAIN INITIALIZATION
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Translate Pane
    document.getElementById('translate-button').addEventListener('click', handleOnPageTranslate);
    document.getElementById('save-to-list-button').addEventListener('click', handleSaveToListClick);

    // Collections Pane
    document.getElementById('show-lists-view').addEventListener('click', () => switchView('lists'));
    document.getElementById('show-history-view').addEventListener('click', () => switchView('history'));
    document.getElementById('create-list-button').addEventListener('click', handleCreateListClick);
    document.getElementById('main-delete-button').addEventListener('click', handleDeleteSelectedClick);
    document.getElementById('select-all-checkbox').addEventListener('click', handleSelectAllClick);

    // Right Pane Tabs
    document.getElementById('show-flashcard-view').addEventListener('click', () => switchRightPaneView('flashcards'));
    document.getElementById('show-notes-view').addEventListener('click', () => switchRightPaneView('notes'));

    // Notes Feature
    document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolderClick);
    document.getElementById('create-new-note-btn').addEventListener('click', handleNewNoteClick);
    initializeNotesEditor();

    // Initial Page Setup
    populateTextboxFromUrl();
    fetchAndPopulateStacksDropdown();
    switchView(currentView);
    switchRightPaneView('flashcards');
});


// ===================================================================================
//  VIEW & PANE MANAGEMENT
// ===================================================================================
function switchRightPaneView(viewToShow) {
    const flashcardContainer = document.getElementById('flashcard-view-container');
    const notesContainer = document.getElementById('notes-view-container');
    const flashcardButton = document.getElementById('show-flashcard-view');
    const notesButton = document.getElementById('show-notes-view');

    flashcardButton.classList.toggle('active', viewToShow === 'flashcards');
    notesButton.classList.toggle('active', viewToShow === 'notes');
    flashcardContainer.classList.toggle('hidden', viewToShow !== 'flashcards');
    notesContainer.classList.toggle('hidden', viewToShow !== 'notes');

    if (viewToShow === 'notes' && !document.getElementById('notes-folder-list').hasChildNodes()) {
        loadAndDisplayFolders();
    } else if (viewToShow === 'flashcards' && !document.getElementById('deck-menu-dropdown').hasChildNodes()) {
        populateDeckSelectorMenu();
    }
}

function switchView(view) {
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

// ===================================================================================
//  TRANSLATE PANE
// ===================================================================================
async function handleOnPageTranslate() {
    const input = document.getElementById('translate-input');
    const output = document.getElementById('translate-output');
    if (!input.value.trim()) return;
    output.value = "Translating...";
    try {
        const response = await fetch(`${API_BASE_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input.value.trim() })
        });
        if (!response.ok) throw new Error("Translation failed");
        const result = await response.json();
        output.value = result.translated_text;
    } catch (error) {
        output.value = "Error during translation.";
        console.error("Translation error:", error);
    }
}

async function handleSaveToListClick() {
    const textInput = document.getElementById('translate-input');
    const selectedStackId = document.getElementById('stack-select-dropdown').value;
    if (!textInput.value.trim()) return alert("Textbox is empty.");
    if (!selectedStackId) return alert("Please select a list.");

    try {
        const response = await fetch(`${API_BASE_URL}/stacks/${selectedStackId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textInput.value.trim(), sourceUrl: window.location.href, pageTitle: document.title })
        });
        if (!response.ok) throw new Error((await response.json()).detail);
        alert("Item saved successfully!");
        textInput.value = '';
        if (currentView === 'history') renderMiddlePane();
    } catch (error) {
        console.error("Failed to save item:", error);
        alert(`Error: ${error.message}`);
    }
}

function populateTextboxFromUrl() {
    const text = new URLSearchParams(window.location.search).get('text');
    if (text) document.getElementById('translate-input').value = text;
}

async function fetchAndPopulateStacksDropdown() {
    const dropdown = document.getElementById('stack-select-dropdown');
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/stacks`);
        const stacks = await response.json();
        dropdown.innerHTML = '<option value="" disabled selected>Select a list</option>';
        stacks.forEach(s => dropdown.innerHTML += `<option value="${s.stack_id}">${s.stack_name}</option>`);
    } catch (error) {
        console.error("Error fetching stacks for dropdown:", error);
    }
}


// ===================================================================================
//  COLLECTIONS & SELECTION (MIDDLE PANE)
// ===================================================================================
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
        const backButton = `<button class="back-button" onclick="switchView('lists')">← Back to all lists</button>`;
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


// ===================================================================================
//  FLASHCARDS LOGIC (RIGHT PANE)
// ===================================================================================
async function populateDeckSelectorMenu() {
    const dropdown = document.getElementById('deck-menu-dropdown');
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/stacks`);
        const stacks = await response.json();
        dropdown.innerHTML = '';
        if (stacks.length > 0) {
            stacks.forEach(stack => {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = stack.stack_name;
                link.addEventListener('click', e => {
                    e.preventDefault();
                    startDeckStudySession(stack.stack_id, stack.stack_name);
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(link);
            });
        } else { dropdown.innerHTML = '<p style="padding: 8px 12px;">No decks found.</p>'; }
        document.getElementById('deck-menu-button').addEventListener('click', () => dropdown.classList.toggle('hidden'));
    } catch (error) { console.error("Failed to fetch decks:", error); }
}

async function startDeckStudySession(deckId, deckName) {
    const container = document.getElementById('flashcard-container');
    container.innerHTML = `<p>Loading deck: <strong>${deckName}</strong>...</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${USER_ID}/stacks/${deckId}/flashcards`);
        flashcardDeck = await response.json();
        if (flashcardDeck.length === 0) {
            container.innerHTML = `<div class="flashcard-placeholder"><p>This deck is empty.</p></div>`;
            return;
        }
        flashcardDeck.sort(() => Math.random() - 0.5);
        currentCardIndex = 0;
        renderCurrentFlashcard();
    } catch (error) { container.innerHTML = '<p class="error-message">Could not load deck.</p>'; }
}

function renderCurrentFlashcard() {
    const container = document.getElementById('flashcard-container');
    if (currentCardIndex >= flashcardDeck.length) {
        container.innerHTML = `<div class="flashcard-placeholder"><p>🎉 Session complete!</p><button id="restart-flashcards">Study Again</button></div>`;
        document.getElementById('restart-flashcards').addEventListener('click', () => startDeckStudySession(flashcardDeck[0].stack_id, "this deck"));
        return;
    }
    const card = flashcardDeck[currentCardIndex];
    container.innerHTML = `
        <div class="flashcard"><div class="flashcard-inner">
            <div class="flashcard-front"><p>${card.front_text}</p></div>
            <div class="flashcard-back"><p>${card.back_text || '(No back text)'}</p></div>
        </div></div>
        <div class="flashcard-controls"><button id="flip-card-btn">Flip</button><div id="rating-buttons" class="hidden"><button id="incorrect-btn" class="danger-button">Incorrect</button><button id="correct-btn">Correct</button></div></div>
        <div class="flashcard-progress">Card ${currentCardIndex + 1} of ${flashcardDeck.length}</div>`;
    
    document.getElementById('flip-card-btn').addEventListener('click', (e) => {
        e.target.closest('.flashcard-controls').previousElementSibling.classList.toggle('is-flipped');
        document.getElementById('rating-buttons').classList.remove('hidden');
        e.target.style.display = 'none';
    });
    document.getElementById('correct-btn').addEventListener('click', () => handleFlashcardReview('correct'));
    document.getElementById('incorrect-btn').addEventListener('click', () => handleFlashcardReview('incorrect'));
}

async function handleFlashcardReview(outcome) {
    // This function can be expanded with more sophisticated review logic
    currentCardIndex++;
    renderCurrentFlashcard();
}

// ===================================================================================
//  NOTES LOGIC (RIGHT PANE)
// ===================================================================================
function initializeNotesEditor() {
    const editor = document.getElementById('note-editor');
    if (!editor) return;
    document.getElementById('notes-bold-btn').addEventListener('click', () => { document.execCommand('bold'); editor.focus(); });
    document.getElementById('notes-italic-btn').addEventListener('click', () => { document.execCommand('italic'); editor.focus(); });
    document.getElementById('notes-underline-btn').addEventListener('click', () => { document.execCommand('underline'); editor.focus(); });
    document.getElementById('notes-font-select').addEventListener('change', (e) => { document.execCommand('fontName', false, e.target.value); editor.focus(); });
    document.getElementById('notes-save-btn').addEventListener('click', saveNote);
}

async function saveNote() {
    const saveButton = document.getElementById('notes-save-btn');
    const title = document.getElementById('note-title-input').value.trim() || "Untitled Note";
    const content = document.getElementById('note-editor').innerHTML;
    if (!currentFolderId) return alert("Please select a folder to save the note in.");
    
    const payload = { title, content, folder_id: currentFolderId };
    const url = currentNoteId ? `${API_BASE_URL}/notes/${currentNoteId}` : `${API_BASE_URL}/notes`;
    const method = currentNoteId ? 'PUT' : 'POST';

    try {
        saveButton.disabled = true; saveButton.textContent = 'Saving...';
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error((await response.json()).detail);
        const savedNote = await response.json();
        if (!currentNoteId) currentNoteId = savedNote.note_id;
        saveButton.textContent = 'Saved ✓';
        loadAndDisplayNotes(currentFolderId);
    } catch (error) {
        alert(`Failed to save note: ${error.message}`);
        saveButton.textContent = 'Save Note';
    } finally {
        setTimeout(() => { saveButton.disabled = false; saveButton.textContent = 'Save Note'; }, 2000);
    }
}

async function handleCreateFolderClick() {
    const folderName = prompt("Enter a name for the new folder:");
    if (!folderName || !folderName.trim()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/folders`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder_name: folderName.trim() })
        });
        if (!response.ok) throw new Error((await response.json()).detail);
        loadAndDisplayFolders();
    } catch (error) { alert(`Error creating folder: ${error.message}`); }
}

async function loadAndDisplayFolders() {
    const list = document.getElementById('notes-folder-list');
    list.innerHTML = '<p>Loading folders...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/folders`);
        const folders = await response.json();
        list.innerHTML = '';
        if (folders.length === 0) { list.innerHTML = '<p>No folders yet.</p>'; return; }
        folders.forEach(f => {
            const item = document.createElement('div');
            item.className = 'notes-list-item';
            item.innerHTML = `<a href="#" data-folder-id="${f.folder_id}">${f.folder_name}</a><button class="delete-item-btn" title="Delete folder">🗑️</button>`;
            item.querySelector('a').addEventListener('click', e => { e.preventDefault(); loadAndDisplayNotes(f.folder_id); });
            item.querySelector('button').addEventListener('click', e => { e.stopPropagation(); handleDeleteFolderClick(f.folder_id, f.folder_name); });
            list.appendChild(item);
        });
    } catch (error) { list.innerHTML = '<p class="error-message">Could not load folders.</p>'; }
}

async function handleDeleteFolderClick(folderId, folderName) {
    if (!confirm(`Delete folder "${folderName}" and all its notes?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete folder");
        if (currentFolderId === folderId) {
            currentFolderId = null; currentNoteId = null;
            document.getElementById('note-list-container').innerHTML = '';
            document.getElementById('note-editor').innerHTML = '';
            document.getElementById('note-title-input').value = '';
        }
        loadAndDisplayFolders();
    } catch (error) { alert(error.message); }
}

async function loadAndDisplayNotes(folderId) {
    document.querySelectorAll('#notes-folder-list a').forEach(a => a.classList.toggle('active', a.dataset.folderId == folderId));
    currentFolderId = folderId;
    const list = document.getElementById('note-list-container');
    list.innerHTML = '<p>Loading notes...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}/notes`);
        const notes = await response.json();
        list.innerHTML = '';
        if (notes.length === 0) { list.innerHTML = '<p>This folder is empty.</p>'; return; }
        notes.forEach(n => {
            const item = document.createElement('div');
            item.className = 'notes-list-item';
            item.innerHTML = `<a href="#" data-note-id="${n.note_id}">${n.title || "Untitled Note"}</a><button class="delete-item-btn" title="Delete note">🗑️</button>`;
            item.querySelector('a').addEventListener('click', e => { e.preventDefault(); loadNoteIntoEditor(n.note_id); });
            item.querySelector('button').addEventListener('click', e => { e.stopPropagation(); handleDeleteNoteClick(n.note_id, n.title); });
            list.appendChild(item);
        });
    } catch (error) { list.innerHTML = '<p class="error-message">Could not load notes.</p>'; }
}

async function handleDeleteNoteClick(noteId, noteTitle) {
    if (!confirm(`Delete note "${noteTitle || 'Untitled Note'}"?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete note");
        if (currentNoteId === noteId) {
            currentNoteId = null;
            document.getElementById('note-editor').innerHTML = '';
            document.getElementById('note-title-input').value = '';
        }
        loadAndDisplayNotes(currentFolderId);
    } catch (error) { alert(error.message); }
}

function handleNewNoteClick() {
    if (!currentFolderId) return alert("Please select a folder first.");
    document.querySelectorAll('#note-list-container a.active').forEach(a => a.classList.remove('active'));
    currentNoteId = null;
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    titleInput.value = "Untitled Note";
    editor.innerHTML = '';
    titleInput.focus();
}

async function loadNoteIntoEditor(noteId) {
    document.querySelectorAll('#note-list-container a').forEach(a => a.classList.toggle('active', a.dataset.noteId == noteId));
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    titleInput.value = 'Loading...'; editor.innerHTML = '<em>Loading...</em>';
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`);
        const note = await response.json();
        titleInput.value = note.title || "Untitled Note";
        editor.innerHTML = note.content || "";
        currentNoteId = note.note_id;
    } catch (error) {
        titleInput.value = 'Error'; editor.innerHTML = '<p class="error-message">Could not load note.</p>';
        currentNoteId = null;
    }
}