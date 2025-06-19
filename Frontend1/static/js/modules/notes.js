// FILE: Frontend1/static/js/modules/notes.js (Final Corrected Version)

import { fetchWithAuth } from '../services/apiService.js'; // <-- IMPORTANT: Import the authenticated fetch service

let state = null;
let renderApp = null;

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
            editor: { title: '', content: '' }
        };
    }
}

// --- Main Rendering Logic ---
export function renderNotes() {
    const container = document.getElementById('notes-folder-list');
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    if (!container || !titleInput || !editor) return;

    if (state.notes.isLoading) {
        container.innerHTML = '<p>Loading...</p>';
    } else {
        container.innerHTML = state.notes.folders.map(FolderComponent).join('');
    }

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
    
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    if (titleInput) titleInput.addEventListener('input', () => state.notes.editor.title = titleInput.value);
    if (editor) editor.addEventListener('input', () => state.notes.editor.content = editor.innerHTML);

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

// --- Data Fetching Functions (Now using fetchWithAuth) ---

async function fetchFolders() {
    state.notes.isLoading = true;
    renderApp();
    try {
        state.notes.folders = await fetchWithAuth('/notes/folders');
    } catch (error) { console.error('Error loading folders:', error); }
    state.notes.isLoading = false;
    renderApp();
}

async function fetchNotesForFolder(folderId) {
    try {
        state.notes.notesByFolder[folderId] = await fetchWithAuth(`/notes/folders/${folderId}/notes`);
    } catch (error) { console.error(`Error fetching notes for folder ${folderId}:`, error); }
}

async function loadNoteIntoEditor(noteId) {
    state.notes.activeNoteId = noteId;
    // ... (logic remains the same, but any internal fetch calls should use fetchWithAuth)
    try {
        const noteToLoad = await fetchWithAuth(`/notes/${noteId}`);
        if (noteToLoad) {
            state.notes.editor.title = noteToLoad.title || "Untitled Note";
            state.notes.editor.content = noteToLoad.content || "";
            state.notes.activeFolderId = noteToLoad.folder_id;
        }
    } catch (error) { console.error("Could not load note:", error); }
    renderApp();
}

// --- Action Handlers (Now using fetchWithAuth) ---

async function handleCreateFolderClick() {
    const folderName = prompt("Enter a name for the new folder:");
    if (!folderName || !folderName.trim()) return;
    try {
        await fetchWithAuth('/notes/folders', {
            method: 'POST',
            body: JSON.stringify({ folder_name: folderName.trim() })
        });
        await fetchFolders(); // Refetch all folders
    } catch (error) { alert(`Error creating folder: ${error.message}`); }
}

async function saveNote() {
    const { activeNoteId, activeFolderId, editor } = state.notes;
    if (!activeFolderId) return alert("A folder must be selected to save a note.");

    const payload = { title: editor.title, content: editor.content, folder_id: activeFolderId };
    const endpoint = activeNoteId ? `/notes/${activeNoteId}` : '/notes/';
    const method = activeNoteId ? 'PUT' : 'POST';

    try {
        const savedNote = await fetchWithAuth(endpoint, { method, body: JSON.stringify(payload) });
        state.notes.activeNoteId = savedNote.note_id;
        await fetchNotesForFolder(activeFolderId);
        renderApp();
    } catch (error) { alert(error.message); }
}

async function handleDeleteNoteClick(noteId, folderId) {
    if (!confirm(`Are you sure you want to delete this note?`)) return;
    try {
        await fetchWithAuth(`/notes/${noteId}`, { method: 'DELETE' });
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
        await fetchWithAuth(`/notes/folders/${folderId}`, { method: 'DELETE' });
        await fetchFolders(); // Refetch to update the folder list
        // Reset editor if the active note was in the deleted folder
        if (state.notes.activeFolderId === folderId) {
            state.notes.activeFolderId = null;
            state.notes.activeNoteId = null;
            state.notes.editor = { title: '', content: '' };
        }
    } catch (error) { alert('Failed to delete folder.'); }
    renderApp();
}


// --- Unchanged Helper Functions ---

function initializeNotesEditorToolbar() { /* ... same as before ... */ }
function handleNewNoteClick() { /* ... same as before ... */ }
function toggleFolder(folderId) { /* ... same as before ... */ }
function FolderComponent(folder) { /* ... same as before ... */ }
function NoteItemComponent(note) { /* ... same as before ... */ }