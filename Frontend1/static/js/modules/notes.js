// State and constants scoped to the Notes module
let currentNoteId = null;
let currentFolderId = null;
const API_BASE_URL = '/api/v1';

/**
 * This is the main initializer function that the main app will call.
 * It sets up the main buttons for the notes feature.
 */
export function initializeNotesFeature() {
    document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolderClick);
    document.getElementById('create-new-note-btn').addEventListener('click', handleNewNoteClick);
    initializeNotesEditor();
    loadAndDisplayFolders(); // Initial load of the folder structure
}

/**
 * Fetches all folders and builds the new accordion UI.
 * Each folder is a clickable header with a container for its notes.
 */
async function loadAndDisplayFolders() {
    const listContainer = document.getElementById('notes-folder-list');
    listContainer.innerHTML = '<p>Loading folders...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/folders`);
        const folders = await response.json();
        listContainer.innerHTML = '';
        if (folders.length === 0) {
            listContainer.innerHTML = '<p style="padding: 10px;">No folders yet.</p>';
            return;
        }

        folders.forEach(f => {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            // Each folder now has a header and a wrapper for its notes list
            folderItem.innerHTML = `
                <div class="folder-header" data-folder-id="${f.folder_id}">
                    <span class="folder-icon">▶</span>
                    <span class="folder-name">${f.folder_name}</span>
                    <button class="delete-item-btn" title="Delete folder">🗑️</button>
                </div>
                <div class="notes-list-wrapper" id="notes-for-folder-${f.folder_id}"></div>
            `;
            
            const header = folderItem.querySelector('.folder-header');
            const notesWrapper = folderItem.querySelector('.notes-list-wrapper');

            // Add click listener to the header to expand/collapse and load notes
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-item-btn')) return;

                const isExpanded = header.classList.toggle('expanded');
                notesWrapper.classList.toggle('expanded', isExpanded);

                // Load notes only on the first time a folder is expanded
                if (isExpanded && notesWrapper.childElementCount === 0) {
                    loadAndDisplayNotes(f.folder_id, notesWrapper);
                }
            });

            // Add click listener to the delete button
            folderItem.querySelector('.delete-item-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the header click event from firing
                handleDeleteFolderClick(f.folder_id, f.folder_name);
            });

            listContainer.appendChild(folderItem);
        });
    } catch (error) {
        console.error('Error loading folders:', error);
        listContainer.innerHTML = '<p class="error-message">Could not load folders.</p>';
    }
}

/**
 * Fetches and displays the notes for a specific folder inside a target container.
 * @param {number} folderId The ID of the folder whose notes to load.
 * @param {HTMLElement} targetContainer The container element to render the notes into.
 */
async function loadAndDisplayNotes(folderId, targetContainer) {
    currentFolderId = folderId;
    targetContainer.innerHTML = `<p style="padding: 10px; color: var(--secondary-text);">Loading notes...</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}/notes`);
        const notes = await response.json();
        targetContainer.innerHTML = ''; // Clear loading message

        if (notes.length === 0) {
            targetContainer.innerHTML = `<p style="padding: 10px; color: var(--secondary-text);">This folder is empty.</p>`;
            return;
        }

        notes.forEach(n => {
            const item = document.createElement('div');
            item.className = 'notes-list-item';
            item.innerHTML = `<a href="#" data-note-id="${n.note_id}">${n.title || "Untitled Note"}</a><button class="delete-item-btn" title="Delete note">🗑️</button>`;
            
            item.querySelector('a').addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('#notes-folder-list a.active').forEach(a => a.classList.remove('active'));
                e.target.classList.add('active');
                loadNoteIntoEditor(n.note_id);
            });

            item.querySelector('button').addEventListener('click', e => {
                e.stopPropagation();
                handleDeleteNoteClick(n.note_id, n.title, folderId);
            });
            
            targetContainer.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading notes:', error);
        targetContainer.innerHTML = `<p style="padding: 10px; color: red;">Error loading notes.</p>`;
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
        loadAndDisplayFolders(); // Re-render the entire folder list
    } catch (error) { alert(`Error creating folder: ${error.message}`); }
}

async function handleDeleteFolderClick(folderId, folderName) {
    if (!confirm(`Delete folder "${folderName}" and all its notes?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete folder");
        loadAndDisplayFolders(); // Re-render the entire folder list
    } catch (error) { alert(error.message); }
}

async function handleDeleteNoteClick(noteId, noteTitle, folderId) {
    if (!confirm(`Delete note "${noteTitle || 'Untitled Note'}"?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete note");

        // If the deleted note was the one being edited, clear the editor
        if (currentNoteId === noteId) {
            currentNoteId = null;
            document.getElementById('note-editor').innerHTML = 'Select or create a note to begin...';
            document.getElementById('note-title-input').value = '';
        }
        
        // Refresh the notes list for the parent folder
        const targetContainer = document.getElementById(`notes-for-folder-${folderId}`);
        if(targetContainer) {
            loadAndDisplayNotes(folderId, targetContainer);
        }
    } catch (error) { alert(error.message); }
}

function handleNewNoteClick() {
    if (!currentFolderId) {
        alert("Please select a folder first before creating a new note.");
        return;
    }
    document.querySelectorAll('#notes-folder-list a.active').forEach(a => a.classList.remove('active'));
    currentNoteId = null; 
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    titleInput.value = "Untitled Note";
    editor.innerHTML = '';
    titleInput.focus();
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
        currentNoteId = savedNote.note_id; // Ensure currentNoteId is set after creation
        
        // Refresh the notes list in the parent folder to show the new/updated note title
        const targetContainer = document.getElementById(`notes-for-folder-${currentFolderId}`);
        if(targetContainer) {
             loadAndDisplayNotes(currentFolderId, targetContainer);
        }

    } catch (error) {
        alert(`Failed to save note: ${error.message}`);
    } finally {
        saveButton.disabled = false; saveButton.textContent = 'Save Note';
    }
}

async function loadNoteIntoEditor(noteId) {
    const titleInput = document.getElementById('note-title-input');
    const editor = document.getElementById('note-editor');
    titleInput.value = 'Loading...'; 
    editor.innerHTML = '<em>Loading...</em>';
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`);
        const note = await response.json();
        titleInput.value = note.title || "Untitled Note";
        editor.innerHTML = note.content || "";
        currentNoteId = note.note_id;
        currentFolderId = note.folder_id; // Also update the current folder context
    } catch (error) {
        titleInput.value = 'Error'; 
        editor.innerHTML = '<p class="error-message">Could not load note.</p>';
        currentNoteId = null;
    }
}

function initializeNotesEditor() {
    const editor = document.getElementById('note-editor');
    if (!editor) return;
    document.getElementById('notes-bold-btn').addEventListener('click', () => { document.execCommand('bold'); editor.focus(); });
    document.getElementById('notes-italic-btn').addEventListener('click', () => { document.execCommand('italic'); editor.focus(); });
    document.getElementById('notes-underline-btn').addEventListener('click', () => { document.execCommand('underline'); editor.focus(); });
    document.getElementById('notes-font-select').addEventListener('change', (e) => { document.execCommand('fontName', false, e.target.value); editor.focus(); });
    document.getElementById('notes-save-btn').addEventListener('click', saveNote);
}