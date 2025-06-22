// FILE: Frontend1/static/js/modules/notes.js (Final Consolidated Version)

import { fetchWithAuth } from "../services/apiService.js";

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
      editor: { title: "", content: "" },
    };
  }
}

// --- Main Rendering Logic ---
export function renderNotes() {
    if (!state) return;

  const container = document.getElementById("notes-folder-list");
  const titleInput = document.getElementById("note-title-input");
  const editor = document.getElementById("note-editor");
  if (!container || !titleInput || !editor) return;

  if (state.notes.isLoading) {
    container.innerHTML = "<p>Loading...</p>";
  } else {
    container.innerHTML = state.notes.folders.map(FolderComponent).join("");
  }

  titleInput.value = state.notes.editor.title;
  editor.innerHTML = state.notes.editor.content;
}

// --- Event Handling and State Changes ---
export function initializeNotesFeature(appState, mainRenderCallback) {
  state = appState;
  renderApp = mainRenderCallback;
  initializeState();

  const notesContainer = document.getElementById("notes-view-container");
  if (notesContainer) {
    notesContainer.addEventListener("click", handleDelegatedEvents);
  }

  const titleInput = document.getElementById("note-title-input");
  const editor = document.getElementById("note-editor");
  if (titleInput) {
    titleInput.addEventListener(
      "input",
      () => (state.notes.editor.title = titleInput.value),
    );
  }
  if (editor) {
    editor.addEventListener(
      "input",
      () => (state.notes.editor.content = editor.innerHTML),
    );
  }

  initializeNotesEditorToolbar();
  fetchFolders();
}


async function handleDelegatedEvents(event) {
  const target = event.target;
  const action =
    target.dataset.action || target.closest("[data-action]")?.dataset.action;

  switch (action) {
    case "toggle-folder":
      toggleFolder(
        parseInt(target.closest("[data-folder-id]").dataset.folderId, 10),
      );
      break;
    case "select-note":
      event.preventDefault();
      loadNoteIntoEditor(parseInt(target.dataset.noteId, 10));
      break;
    case "delete-note":
      // This case is now handled by the right-click menu, but we can leave it
      // in case you want to add back a button later.
      handleDeleteNoteClick(
        parseInt(target.dataset.noteId, 10),
        parseInt(target.closest("[data-folder-id]").dataset.folderId, 10),
      );
      break;
    case "delete-folder":
      // This case is also handled by the right-click menu.
      event.stopPropagation();
      handleDeleteFolderClick(
        parseInt(target.closest("[data-folder-id]").dataset.folderId, 10),
        target.closest("[data-folder-name]").dataset.folderName,
      );
      break;
    case "create-folder":
      handleCreateFolderClick();
      break;
    case "create-note":
      handleNewNoteClick();
      break;
    case "save-note":
      saveNote();
      break;
  }
}

// --- Data Fetching Functions ---

async function fetchFolders() {
  console.log("MOCK: Fetching folders.");
  state.notes.isLoading = true;
  renderApp();
  
  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 500)); 

  // Provide fake folder data
  const mockFolders = [
    { folder_id: 1, folder_name: "Work Projects" },
    { folder_id: 2, folder_name: "Personal Ideas" },
    { folder_id: 3, folder_name: "Meeting Notes" },
  ];
  
  state.notes.folders = mockFolders;
  state.notes.isLoading = false;
  console.log("MOCK: Folders loaded.", state.notes.folders);
  renderApp();
}

async function fetchNotesForFolder(folderId) {
  console.log(`MOCK: Fetching notes for folder ${folderId}`);
  await new Promise(resolve => setTimeout(resolve, 300));

  const mockNotes = {
    1: [ // Notes for folderId 1
      { note_id: 101, title: "Project Alpha UI Mockups", folder_id: 1 },
      { note_id: 102, title: "Q3 Marketing Strategy", folder_id: 1 },
    ],
    2: [ // Notes for folderId 2
      { note_id: 201, title: "My Novel Outline", folder_id: 2 },
    ],
    3: [], // Folder 3 has no notes
  };

  state.notes.notesByFolder[folderId] = mockNotes[folderId] || [];
  console.log(`MOCK: Notes for folder ${folderId} loaded.`);
}

/* --- ORIGINAL FUNCTION (COMMENTED OUT) ---
async function fetchNotesForFolder(folderId) {
  try {
    state.notes.notesByFolder[folderId] = await fetchWithAuth(
      `/notes/folders/${folderId}/notes`,
    );
  } catch (error) {
    console.error(`Error fetching notes for folder ${folderId}:`, error);
  }
}
*/

async function loadNoteIntoEditor(noteId) {
    console.log(`MOCK: Loading note ${noteId} into editor.`);
    state.notes.activeNoteId = noteId;
    
    // Find the note from our mock data
    let noteToLoad;
    for (const folderId in state.notes.notesByFolder) {
        const found = state.notes.notesByFolder[folderId].find(n => n.note_id === noteId);
        if (found) {
            noteToLoad = found;
            break;
        }
    }
    
    if (noteToLoad) {
        state.notes.editor.title = noteToLoad.title;
        state.notes.editor.content = `This is the mock content for <b>${noteToLoad.title}</b>.`;
        state.notes.activeFolderId = noteToLoad.folder_id;
    } else {
        console.error("MOCK: Note not found!");
        state.notes.editor.title = "Error";
        state.notes.editor.content = "Could not find this note in mock data.";
    }
    
    renderApp();
}

/* --- ORIGINAL FUNCTION (COMMENTED OUT) ---
async function loadNoteIntoEditor(noteId) {
  state.notes.activeNoteId = noteId;
  try {
    const noteToLoad = await fetchWithAuth(`/notes/${noteId}`);
    if (noteToLoad) {
      state.notes.editor.title = noteToLoad.title || "Untitled Note";
      state.notes.editor.content = noteToLoad.content || "";
      state.notes.activeFolderId = noteToLoad.folder_id;
    }
  } catch (error) {
    console.error("Could not load note:", error);
  }
  renderApp();
}
*/

// --- Action Handlers ---

async function handleCreateFolderClick() {
  const folderName = prompt("Enter a name for the new folder:");
  if (!folderName || !folderName.trim()) return;
  try {
    await fetchWithAuth("/notes/folders", {
      method: "POST",
      body: JSON.stringify({ folder_name: folderName.trim() }),
    });
    await fetchFolders(); // Refetch all folders
  } catch (error) {
    alert(`Error creating folder: ${error.message}`);
  }
}

async function saveNote() {
  const { activeNoteId, activeFolderId, editor } = state.notes;
  if (!activeFolderId)
    return alert("A folder must be selected to save a note.");

  const payload = {
    title: editor.title,
    content: editor.content,
    folder_id: activeFolderId,
  };
  const endpoint = activeNoteId ? `/notes/${activeNoteId}` : "/notes/";
  const method = activeNoteId ? "PUT" : "POST";

  try {
    const savedNote = await fetchWithAuth(endpoint, {
      method,
      body: JSON.stringify(payload),
    });
    state.notes.activeNoteId = savedNote.note_id;
    await fetchNotesForFolder(activeFolderId);
    renderApp();
  } catch (error) {
    alert(error.message);
  }
}

async function handleDeleteNoteClick(noteId, folderId) {
  if (!confirm(`Are you sure you want to delete this note?`)) return;
  try {
    await fetchWithAuth(`/notes/${noteId}`, { method: "DELETE" });
    if (state.notes.activeNoteId === noteId) {
      state.notes.activeNoteId = null;
      state.notes.editor = { title: "", content: "" };
    }
    await fetchNotesForFolder(folderId);
    renderApp();
  } catch (error) {
    alert("Failed to delete note.");
  }
}

async function handleDeleteFolderClick(folderId, folderName) {
  if (
    !confirm(
      `Delete folder "${folderName}" and all its notes? This cannot be undone.`,
    )
  )
    return;
  try {
    await fetchWithAuth(`/notes/folders/${folderId}`, { method: "DELETE" });
    await fetchFolders(); // Refetch to update the folder list
    if (state.notes.activeFolderId === folderId) {
      state.notes.activeFolderId = null;
      state.notes.activeNoteId = null;
      state.notes.editor = { title: "", content: "" };
    }
  } catch (error) {
    alert("Failed to delete folder.");
  }
  renderApp();
}

// --- IMPLEMENTED HELPER AND COMPONENT FUNCTIONS ---

/**
 * Attaches event listeners to the rich text editor toolbar buttons.
 * This is a basic implementation.
 */
function initializeNotesEditorToolbar() {
  const toolbar = document.getElementById("notes-toolbar");
  if (toolbar) {
    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const command = button.dataset.command;
      if (command) {
        event.preventDefault();
        document.execCommand(command, false, null);
      }
    });
  }
}

/**
 * Clears the editor state to prepare for a new, unsaved note.
 * A folder must be selected first.
 */
function handleNewNoteClick() {
  if (!state.notes.activeFolderId) {
    return alert("Please select a folder before creating a new note.");
  }
  state.notes.activeNoteId = null; // This indicates it's a new note
  state.notes.editor.title = "New Note";
  state.notes.editor.content = "";
  renderApp();
  document.getElementById("note-title-input").focus();
}

/**
 * Toggles the expanded/collapsed state of a folder.
 * @param {number} folderId The ID of the folder to toggle.
 */
function toggleFolder(folderId) {
  if (state.notes.expandedFolders.has(folderId)) {
    state.notes.expandedFolders.delete(folderId);
  } else {
    state.notes.expandedFolders.add(folderId);
    if (!state.notes.notesByFolder[folderId]) {
      fetchNotesForFolder(folderId).then(() => renderApp());
    }
  }
  renderApp();
}

/**
 * Renders the HTML for a single folder item.
 * @param {object} folder The folder object from the state.
 * @returns {string} The HTML string for the folder.
 */
// In /static/js/modules/notes.js

function FolderComponent(folder) {
    const isExpanded = state.notes.expandedFolders.has(folder.folder_id);
    const notesForFolder = state.notes.notesByFolder[folder.folder_id] || [];

    // The <button> for the trashcan has been deleted from this template string.
    return `
        <div class="folder-item">
            <div class="folder-header ${isExpanded ? "expanded" : ""}" data-action="toggle-folder" data-folder-id="${folder.folder_id}" data-folder-name="${folder.folder_name}">
                <i class="bi bi-chevron-right folder-icon"></i>
                <span class="folder-name">${folder.folder_name}</span>
            </div>
            <div class="notes-list-wrapper ${isExpanded ? "expanded" : ""}">
                ${notesForFolder.map(NoteItemComponent).join("")}
            </div>
        </div>
    `;
}

/**
 * Renders the HTML for a single note item within a folder.
 * @param {object} note The note object from the state.
 * @returns {string} The HTML string for the note item.
 */
// In notes.js

function NoteItemComponent(note) {
    const isActive = state.notes.activeNoteId === note.note_id;
    // The dataset now includes folderId so the context menu can find it
    return `
        <div class="notes-list-item">
            <a href="#" class="${isActive ? "active" : ""}" 
               data-action="select-note" 
               data-note-id="${note.note_id}" 
               data-folder-id="${note.folder_id}">
                ${note.title || "Untitled Note"}
            </a>
        </div>
    `;
}
