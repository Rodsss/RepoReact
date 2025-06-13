// Global variables specific to the Notes feature
let currentNoteId = null;
let currentFolderId = null;

// Constants used within this module
const API_BASE_URL = '/api/v1';

// A single function to be exported, which sets up the feature
export function initializeNotesFeature() {
    document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolderClick);
    document.getElementById('create-new-note-btn').addEventListener('click', handleNewNoteClick);
    initializeNotesEditor();
}

// All the detailed functions for the Notes feature remain here
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