let currentNoteId = null;
let currentFolderId = null;

// --- MAIN EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners for the notes feature
    document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolderClick);
    document.getElementById('create-new-note-btn').addEventListener('click', handleNewNoteClick);

    // Initial setup for the notes page
    initializeNotesEditor(); 
    loadAndDisplayFolders();
});


// --- NOTES LOGIC ---

async function handleCreateFolderClick() {
    const folderName = prompt("Enter a name for the new folder:");
    if (!folderName || folderName.trim() === '') return;
    
    try {
        const response = await fetch('/api/v1/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_name: folderName.trim() })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create folder');
        }
        
        await response.json();
        alert(`Folder "${folderName}" created successfully!`);
        loadAndDisplayFolders();
    } catch (error) {
        console.error('Error creating folder:', error);
        alert(`Error: ${error.message}`);
    }
}

async function loadAndDisplayFolders() {
    const folderListContainer = document.getElementById('notes-folder-list');
    folderListContainer.innerHTML = '<p style="padding: 10px; color: var(--secondary-text);">Loading folders...</p>';
    try {
        const response = await fetch('/api/v1/folders');
        if (!response.ok) throw new Error('Failed to fetch folders');
        
        const folders = await response.json();
        folderListContainer.innerHTML = '';

        if (folders.length === 0) {
            folderListContainer.innerHTML = '<p style="padding: 10px; color: var(--secondary-text);">No folders yet.</p>';
            return;
        }

        folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'notes-list-item';

            const folderLink = document.createElement('a');
            folderLink.href = '#';
            folderLink.textContent = folder.folder_name;
            folderLink.dataset.folderId = folder.folder_id;
            folderLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.notes-list-item a.active').forEach(a => a.classList.remove('active'));
                folderLink.classList.add('active');
                loadAndDisplayNotes(folder.folder_id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-item-btn';
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = `Delete "${folder.folder_name}" folder`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteFolderClick(folder.folder_id, folder.folder_name);
            });

            folderItem.appendChild(folderLink);
            folderItem.appendChild(deleteBtn);
            folderListContainer.appendChild(folderItem);
        });
    } catch (error) {
        console.error('Error loading folders:', error);
        folderListContainer.innerHTML = '<p style="padding: 10px; color: red;">Could not load folders.</p>';
    }
}

async function handleDeleteFolderClick(folderId, folderName) {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"?\n\nThis will also delete ALL notes inside it.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/v1/folders/${folderId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete folder');
        }

        if (currentFolderId === folderId) {
            currentFolderId = null;
            currentNoteId = null;
            document.getElementById('note-list-container').innerHTML = '<p style="padding: 10px; color: var(--secondary-text);">Select a folder to see notes.</p>';
            document.getElementById('note-editor').innerHTML = 'Select or create a note to begin...';
            document.getElementById('note-title-input').value = '';
        }
        
        loadAndDisplayFolders();

    } catch (error) {
        console.error('Error deleting folder:', error);
        alert(`Error: ${error.message}`);
    }
}

async function loadAndDisplayNotes(folderId) {
    currentFolderId = folderId;
    const noteListContainer = document.getElementById('note-list-container');
    noteListContainer.innerHTML = `<p style="padding: 10px; color: var(--secondary-text);">Loading notes...</p>`;

    try {
        const response = await fetch(`/api/v1/folders/${folderId}/notes`);
        if (!response.ok) throw new Error('Failed to fetch notes for this folder.');
        
        const notes = await response.json();
        noteListContainer.innerHTML = '';

        if (notes.length === 0) {
            noteListContainer.innerHTML = `<p style="padding: 10px; color: var(--secondary-text);">This folder is empty.</p>`;
        } else {
            notes.forEach(note => {
                const noteItem = document.createElement('div');
                noteItem.className = 'notes-list-item';

                const noteLink = document.createElement('a');
                noteLink.href = '#';
                noteLink.textContent = note.title || "Untitled Note";
                noteLink.dataset.noteId = note.note_id;
                noteLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('#note-list-container a.active').forEach(a => a.classList.remove('active'));
                    noteLink.classList.add('active');
                    loadNoteIntoEditor(note.note_id);
                });
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-item-btn';
                deleteBtn.textContent = '🗑️';
                deleteBtn.title = `Delete "${note.title || 'Untitled Note'}"`;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDeleteNoteClick(note.note_id, note.title);
                });

                noteItem.appendChild(noteLink);
                noteItem.appendChild(deleteBtn);
                noteListContainer.appendChild(noteItem);
            });
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        noteListContainer.innerHTML = `<p style="padding: 10px; color: red;">Error loading notes.</p>`;
    }
}

async function handleDeleteNoteClick(noteId, noteTitle) {
    if (!confirm(`Are you sure you want to delete the note "${noteTitle || 'Untitled Note'}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/v1/notes/${noteId}`, { method: 'DELETE' });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete note');
        }

        if (currentNoteId === noteId) {
            currentNoteId = null;
            document.getElementById('note-editor').innerHTML = 'Select or create a note to begin...';
            document.getElementById('note-title-input').value = '';
        }

        if (currentFolderId) {
            loadAndDisplayNotes(currentFolderId);
        }

    } catch (error) {
        console.error('Error deleting note:', error);
        alert(`Error: ${error.message}`);
    }
}

function handleNewNoteClick() {
    if (!currentFolderId) {
        alert("Please select a folder first before creating a new note.");
        return;
    }
    document.querySelectorAll('.notes-list-item a.active').forEach(a => a.classList.remove('active'));

    const editor = document.getElementById('note-editor');
    const titleInput = document.getElementById('note-title-input');
    
    titleInput.value = "Untitled Note";
    editor.innerHTML = '';
    currentNoteId = null; 

    titleInput.focus();
}

async function loadNoteIntoEditor(noteId) {
    const editor = document.getElementById('note-editor');
    const titleInput = document.getElementById('note-title-input');
    editor.innerHTML = '<em>Loading note...</em>';
    titleInput.value = 'Loading...';

    try {
        const response = await fetch(`/api/v1/notes/${noteId}`);
        if (!response.ok) throw new Error('Failed to load the selected note.');
        
        const note = await response.json();
        
        editor.innerHTML = note.content || "";
        titleInput.value = note.title || "Untitled Note";
        currentNoteId = note.note_id;

    } catch (error) {
        console.error('Error loading note:', error);
        editor.innerHTML = '<p style="color: red;">Could not load the selected note.</p>';
        titleInput.value = 'Error';
        currentNoteId = null;
    }
}

function initializeNotesEditor() {
    const editor = document.getElementById('note-editor');
    if (!editor) return;

    document.getElementById('notes-bold-btn').addEventListener('click', () => {
        document.execCommand('bold', false, null);
        editor.focus();
    });

    document.getElementById('notes-italic-btn').addEventListener('click', () => {
        document.execCommand('italic', false, null);
        editor.focus();
    });

    document.getElementById('notes-underline-btn').addEventListener('click', () => {
        document.execCommand('underline', false, null);
        editor.focus();
    });

    document.getElementById('notes-font-select').addEventListener('change', (e) => {
        const fontName = e.target.value;
        document.execCommand('fontName', false, fontName);
        editor.focus();
    });

    document.getElementById('notes-save-btn').addEventListener('click', async () => {
        const saveButton = document.getElementById('notes-save-btn');
        const noteTitle = document.getElementById('note-title-input').value.trim() || "Untitled Note";
        const noteContent = document.getElementById('note-editor').innerHTML;

        const payload = {
            title: noteTitle,
            content: noteContent,
            folder_id: currentFolderId
        };

        if (!payload.folder_id) {
            alert("Please select a folder before saving a note.");
            return;
        }

        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            let response;
            let url = '/api/v1/notes';
            let method = 'POST';

            if (currentNoteId) {
                url = `/api/v1/notes/${currentNoteId}`;
                method = 'PUT';
            }

            response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save note');
            }

            const savedNote = await response.json();
            
            if (!currentNoteId) {
                currentNoteId = savedNote.note_id; 
            }

            saveButton.textContent = 'Saved ✓';
            
            loadAndDisplayNotes(currentFolderId);

        } catch (error) {
            console.error('Error saving note:', error);
            alert(`Failed to save note: ${error.message}`);
            saveButton.textContent = 'Save Note';
        } finally {
            setTimeout(() => {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Note';
            }, 2000);
        }
    });
}