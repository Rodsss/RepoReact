//
// FILE: Frontend1/static/js/modules/notes.js (Fully Refactored)
//
let state = null;
let renderApp = null;
const API_BASE_URL = '/api/v1';

// --- State Initializer ---
function initializeState() {
    if (!state.notes) {
        state.notes = {
            folders: [],
            notesByFolder: {},
            expandedFolders: new Set(),
            activeNoteId: null,
            activeFolderId: null,
            isLoading: true,
            editor: {
                title: '',
                content: ''
            }
        };
    }
}

// --- Component Functions (Return HTML strings) ---

function NoteItemComponent(note) {
    const isActive = note.note_id === state.notes.activeNoteId ? 'active' : '';
    return `
        <div class="notes-list-item">
            <a href="#" class="${isActive}" data-action="select-note" data-note-id="${note.note_id}">${note.title || "Untitled Note"}</a>
            <button class="delete-item-btn" data-action="delete-note" data-note-id="${note.note_id}" data-folder-id="${note.folder_id}" title="Delete note">🗑️</button>
        </div>
    `;
}

function FolderComponent(folder) {
    const isExpanded = state.notes.expandedFolders.has(folder.folder_id);
    const notes = state.notes.notesByFolder[folder.folder_id] || [];
    const notesHTML = isExpanded
        ? (notes.length > 0 ? notes.map(NoteItemComponent).join('') : '<p class="empty-folder-msg">This folder is empty.</p>')
        : '';

    return `
        <div class="folder-item">
            <div class="folder-header ${isExpanded ? 'expanded' : ''}" data-action="toggle-folder" data-folder-id="${folder.folder_id}">
                <span class="folder-icon">▶</span>
                <span class="folder-name">${folder.folder_name}</span>
                <button class="delete-item-btn" data-action="delete-folder" data-folder-id="${folder.folder_id}" data-folder-name="${folder.folder_name}" title="Delete folder">🗑️</button>
            </div>
            <div class="notes-list-wrapper ${isExpanded ? 'expanded' : ''}">
                ${notesHTML}
            </div>
        </div>
    `;
}

// --- Main Rendering Logic ---

export function renderNotes() {
    const container = document.getElementById('notes-folder-list');
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    if (!container || !titleInput || !editor) return;

    // Render folder list
    if (state.notes.isLoading) {
        container.innerHTML = '<p>Loading...</p>';
    } else {
        container.innerHTML = state.notes.folders.map(FolderComponent).join('');
    }

    // Render the editor content based on state
    titleInput.value = state.notes.editor.title;
    editor.innerHTML = state.notes.editor.content;
}

// --- Event Handling and State Changes ---

export function initializeNotesFeature(appState, mainRenderCallback) {
    state = appState;
    renderApp = mainRenderCallback;
    initializeState();

    const notesContainer = document.getElementById('notes-view-container');
    if (notesContainer) {
        notesContainer.addEventListener('click', handleDelegatedEvents);
    }
    
    // Listen for input changes to update state
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    titleInput.addEventListener('input', () => state.notes.editor.title = titleInput.value);
    editor.addEventListener('input', () => state.notes.editor.content = editor.innerHTML);

    initializeNotesEditorToolbar();
    fetchFolders();
}

async function handleDelegatedEvents(event) {
    const target = event.target;
    const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;

    switch (action) {
        case 'toggle-folder':
            toggleFolder(parseInt(target.closest('[data-folder-id]').dataset.folderId, 10));
            break;
        case 'select-note':
            event.preventDefault();
            loadNoteIntoEditor(parseInt(target.dataset.noteId, 10));
            break;
        case 'delete-note':
            handleDeleteNoteClick(parseInt(target.dataset.noteId, 10), parseInt(target.dataset.folderId, 10));
            break;
        case 'delete-folder':
            event.stopPropagation();
            handleDeleteFolderClick(parseInt(target.dataset.folderId, 10), target.dataset.folderName);
            break;
        case 'create-folder':
            handleCreateFolderClick();
            break;
        case 'create-note':
            handleNewNoteClick();
            break;
        case 'save-note':
            saveNote();
            break;
    }
}

async function fetchFolders() {
    state.notes.isLoading = true;
    renderApp();
    try {
        const response = await fetch(`${API_BASE_URL}/folders`);
        state.notes.folders = await response.json();
    } catch (error) { console.error('Error loading folders:', error); }
    state.notes.isLoading = false;
    renderApp();
}

async function fetchNotesForFolder(folderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}/notes`);
        state.notes.notesByFolder[folderId] = await response.json();
    } catch (error) { console.error(`Error fetching notes for folder ${folderId}:`, error); }
}

async function toggleFolder(folderId) {
    if (state.notes.expandedFolders.has(folderId)) {
        state.notes.expandedFolders.delete(folderId);
    } else {
        state.notes.expandedFolders.add(folderId);
        if (!state.notes.notesByFolder[folderId]) {
            await fetchNotesForFolder(folderId);
        }
    }
    renderApp();
}

async function loadNoteIntoEditor(noteId) {
    state.notes.activeNoteId = noteId;
    let noteToLoad = findActiveNote();

    if (!noteToLoad) { // If note isn't already loaded in state, fetch it
        try {
            const response = await fetch(`${API_BASE_URL}/notes/${noteId}`);
            noteToLoad = await response.json();
            // Add it to the state
            if (noteToLoad && noteToLoad.folder_id) {
                if (!state.notes.notesByFolder[noteToLoad.folder_id]) {
                    state.notes.notesByFolder[noteToLoad.folder_id] = [];
                }
                const index = state.notes.notesByFolder[noteToLoad.folder_id].findIndex(n => n.note_id === noteId);
                if (index > -1) state.notes.notesByFolder[noteToLoad.folder_id][index] = noteToLoad;
                else state.notes.notesByFolder[noteToLoad.folder_id].push(noteToLoad);
            }
        } catch (error) { console.error("Could not load note:", error); }
    }

    if (noteToLoad) {
        state.notes.editor.title = noteToLoad.title || "Untitled Note";
        state.notes.editor.content = noteToLoad.content || "";
        state.notes.activeFolderId = noteToLoad.folder_id;
    }
    renderApp();
}

function findActiveNote() {
    if (!state.notes.activeNoteId) return null;
    for (const folderId in state.notes.notesByFolder) {
        const note = (state.notes.notesByFolder[folderId] || []).find(n => n.note_id === state.notes.activeNoteId);
        if (note) return note;
    }
    return null;
}

function handleNewNoteClick() {
    if (!state.notes.activeFolderId && state.notes.expandedFolders.size === 0) {
        return alert("Please select or expand a folder first.");
    }
    const folderId = state.notes.activeFolderId || state.notes.expandedFolders.values().next().value;
    
    state.notes.activeNoteId = null; // This indicates we are creating a new note
    state.notes.activeFolderId = folderId;
    state.notes.editor.title = "Untitled Note";
    state.notes.editor.content = "";
    renderApp();
    document.getElementById('note-title-input').focus();
}

async function handleCreateFolderClick() {
    const folderName = prompt("Enter a name for the new folder:");
    if (!folderName || !folderName.trim()) return;
    try {
        await fetch(`${API_BASE_URL}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_name: folderName.trim() })
        });
        await fetchFolders(); // Refetch all folders to update the list
    } catch (error) { alert(`Error creating folder: ${error.message}`); }
}

async function saveNote() {
    const { activeNoteId, activeFolderId, editor } = state.notes;
    if (!activeFolderId) return alert("A folder must be selected to save a note.");

    const payload = { title: editor.title, content: editor.content, folder_id: activeFolderId };
    const url = activeNoteId ? `${API_BASE_URL}/notes/${activeNoteId}` : `${API_BASE_URL}/notes`;
    const method = activeNoteId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Failed to save note');
        const savedNote = await response.json();
        
        // Update state and re-render
        state.notes.activeNoteId = savedNote.note_id;
        await fetchNotesForFolder(activeFolderId);
        renderApp();

    } catch (error) { alert(error.message); }
}

async function handleDeleteNoteClick(noteId, folderId) {
    if (!confirm(`Are you sure you want to delete this note?`)) return;
    try {
        await fetch(`${API_BASE_URL}/notes/${noteId}`, { method: 'DELETE' });
        if (state.notes.activeNoteId === noteId) {
            state.notes.activeNoteId = null;
            state.notes.editor = { title: '', content: '' };
        }
        await fetchNotesForFolder(folderId);
        renderApp();
    } catch (error) { alert('Failed to delete note.'); }
}

async function handleDeleteFolderClick(folderId, folderName) {
    if (!confirm(`Delete folder "${folderName}" and all its notes? This cannot be undone.`)) return;
    try {
        await fetch(`${API_BASE_URL}/folders/${folderId}`, { method: 'DELETE' });
        // Clear out related state
        delete state.notes.notesByFolder[folderId];
        state.notes.expandedFolders.delete(folderId);
        if (state.notes.activeFolderId === folderId) {
            state.notes.activeFolderId = null;
            state.notes.activeNoteId = null;
            state.notes.editor = { title: '', content: '' };
        }
        await fetchFolders();
    } catch (error) { alert('Failed to delete folder.'); }
}

function initializeNotesEditorToolbar() {
    document.getElementById('notes-save-btn').dataset.action = 'save-note';
    document.getElementById('create-folder-btn').dataset.action = 'create-folder';
    document.getElementById('create-new-note-btn').dataset.action = 'create-note';

    // Other toolbar buttons can be initialized here if needed
    document.getElementById('notes-bold-btn').addEventListener('click', () => document.execCommand('bold'));
    document.getElementById('notes-italic-btn').addEventListener('click', () => document.execCommand('italic'));
    document.getElementById('notes-underline-btn').addEventListener('click', () => document.execCommand('underline'));
}