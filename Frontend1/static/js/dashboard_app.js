/**
 * =============================================================================
 * dashboard_app.js
 * * Main application controller for the dashboard. This script:
 * 1. Imports all feature modules.
 * 2. Manages shared application state.
 * 3. Initializes all modules when the page loads.
 * 4. Sets up event listeners for inter-module communication and UI control.
 * =============================================================================
 */

// --- 1. MODULE IMPORTS ---
import TranslateModule from './modules/translate.js';
import CollectionsModule from './modules/collections.js';
import { initializeNotesFeature, renderNotes } from './modules/notes.js';
import { initializeMediaSearchFeature, renderMediaSearch } from './modules/media_search.js';
import { initializeFlashcardsFeature, renderFlashcards } from './modules/flashcards.js';
import { initializeConnectFeature, renderConnect } from './modules/connect.js';
import { initializeReadFeature, renderRead } from './modules/read.js';
import contextMenu from './modules/contextMenu.js';


// --- 2. GLOBAL STATE & RENDER ---
const appState = {
    // A dummy userId for modules that require it.
    // In a real app, this would be set after user login.
    userId: 1,

    mediaSearch: {
        searchStatus: 'idle',
        mediaSearchResults: []
    },
};

/**
 * Main render function. Called whenever state changes in a managed module.
 */
function renderApp() {
    renderNotes();
    renderMediaSearch();
    renderFlashcards();
    renderConnect();
    renderRead();
}

/**
 * Handles the logic for dragging and reordering tabs in Pane 3.
 */
function initializeDraggableTabs() {
    const navContainer = document.getElementById('pane-three-nav');
    if (!navContainer) return;

    navContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('pane-nav-button')) {
            e.target.classList.add('dragging');
        }
    });

    navContainer.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('pane-nav-button')) {
            e.target.classList.remove('dragging');
        }
    });

    navContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;

        const afterElement = getDragAfterElement(navContainer, e.clientX);
        if (afterElement == null) {
            navContainer.appendChild(dragging);
        } else {
            navContainer.insertBefore(dragging, afterElement);
        }
    });
}

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.pane-nav-button:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


// --- 3. MAIN INITIALIZER & EVENT WIRING ---
document.addEventListener('DOMContentLoaded', () => {

    console.log("Dashboard initializing...");

    // --- Initialize All Feature Modules ---
    TranslateModule.init();
    CollectionsModule.init();
    initializeNotesFeature(appState, renderApp);
    initializeMediaSearchFeature(appState, renderApp);
    initializeFlashcardsFeature(appState, renderApp);
    initializeConnectFeature(appState, renderApp);
    initializeReadFeature(appState, renderApp);
    initializeDraggableTabs();
    console.log("All modules initialized.");

    // --- Inter-Module Communication Event Listeners ---
    document.addEventListener('requestListsForModal', (event) => {
        const { text } = event.detail;
        TranslateModule.renderModalLists(CollectionsModule.getLists(), text);
    });
    document.addEventListener('saveWordToList', (event) => {
        const { text, list } = event.detail;
        CollectionsModule.addWordToList(text, list);
    });
    document.addEventListener('wordSelected', (event) => {
        const { text } = event.detail;
        TranslateModule.setText(text);
    });

    // --- Custom Right-Click Context Menu Wiring ---
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('contextmenu', (event) => {
            const target = event.target;
            
            const wordItem = target.closest('.word-item');
            const noteItem = target.closest('.notes-list-item a');
            const folderHeader = target.closest('.folder-header');
            const listItem = target.closest('.list-group-item');
            const deckItem = target.closest('.deck-list-item');

            if (!wordItem && !noteItem && !folderHeader && !listItem && !deckItem) return;

            event.preventDefault();
            
            const options = [];
            let targetInfo = {};

            if (wordItem) {
                targetInfo = { type: 'word', wordId: wordItem.dataset.wordId, text: wordItem.querySelector('.word-text').textContent };
                options.push({ label: 'Translate Word', action: 'translate-word', icon: 'bi-translate', targetInfo });
                options.push({ type: 'separator' });
                options.push({ label: 'Delete Word', action: 'delete-word', icon: 'bi-trash', targetInfo });
            } else if (noteItem) {
                targetInfo = { type: 'note', noteId: noteItem.dataset.noteId, folderId: noteItem.dataset.folderId, title: noteItem.textContent.trim() };
                options.push({ label: 'Move Note', action: 'move-note', icon: 'bi-folder-symlink', targetInfo });
                options.push({ type: 'separator' });
                options.push({ label: 'Delete Note', action: 'delete-note', icon: 'bi-trash', targetInfo });
            } else if (folderHeader) {
                targetInfo = { type: 'folder', folderId: folderHeader.dataset.folderId, folderName: folderHeader.dataset.folderName };
                options.push({ label: 'Rename Folder', action: 'rename-folder', icon: 'bi-pencil-square', targetInfo });
                options.push({ label: 'Delete Folder', action: 'delete-folder', icon: 'bi-trash', targetInfo });
            } else if (listItem) {
                targetInfo = { type: 'list', listIndex: listItem.dataset.index, listName: listItem.dataset.listName };
                options.push({ label: 'Rename List', action: 'rename-list', icon: 'bi-pencil-square', targetInfo });
                options.push({ label: 'Delete List', action: 'delete-list', icon: 'bi-trash', targetInfo });
            } else if (deckItem) {
                targetInfo = { type: 'deck', deckId: deckItem.dataset.deckId, deckName: deckItem.dataset.deckName };
                options.push({ label: 'Rename Deck', action: 'rename-deck', icon: 'bi-pencil-square', targetInfo });
                options.push({ label: 'Delete Deck', action: 'delete-deck', icon: 'bi-trash', targetInfo });
            }

            if (options.length > 0) {
                contextMenu.show(event.pageX, event.pageY, options);
            }
        });
    }

    // --- Context Menu Action Handler ---
    document.addEventListener('contextAction', (event) => {
        const { action, targetInfo } = event.detail;
        console.log(`Action selected: ${action}`, targetInfo);

        switch (action) {
            case 'rename-deck':
                const newDeckName = prompt(`Enter new name for deck "${targetInfo.deckName}":`, targetInfo.deckName);
                if (newDeckName && newDeckName.trim()) { alert(`Deck renamed to "${newDeckName.trim()}"! (Mocked)`); }
                break;
            case 'delete-deck':
                if (confirm(`Are you sure you want to delete the deck "${targetInfo.deckName}"?`)) { alert('Deck deleted! (Mocked)'); }
                break;
            case 'rename-list':
                const newName = prompt(`Enter a new name for the list "${targetInfo.listName}":`, targetInfo.listName);
                if (newName && newName.trim() !== '') { alert(`List renamed to "${newName.trim()}"! (functionality to be fully connected)`); }
                break;
            case 'delete-list':
                if (confirm(`Are you sure you want to delete the list "${targetInfo.listName}"?`)) { alert('List deleted! (functionality to be fully connected)'); }
                break;
            case 'delete-note':
                if (confirm(`Are you sure you want to delete the note "${targetInfo.title}"?`)) { alert('Note deleted! (functionality to be fully connected)'); }
                break;
            case 'delete-word':
                if (confirm(`Are you sure you want to delete the word "${targetInfo.text}"?`)) { alert('Word deleted! (functionality to be fully connected)'); }
                break;
            case 'delete-folder':
                if (confirm(`Are you sure you want to delete the folder "${targetInfo.folderName}" and all its contents?`)) { alert('Folder deleted! (functionality to be fully connected)'); }
                break;
            case 'translate-word':
                TranslateModule.setText(targetInfo.text);
                break;
        }
    });


    // --- UI Controllers ---
    const pane3 = document.getElementById('pane-three');
    if (pane3) {
        pane3.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.pane-nav-button');
            if (!targetButton) return;
            const allNavButtons = pane3.querySelectorAll('.pane-nav-button');
            const allContentPanels = pane3.querySelectorAll('.pane-nav-content');
            allNavButtons.forEach(btn => btn.classList.remove('active'));
            allContentPanels.forEach(panel => panel.classList.remove('active'));
            targetButton.classList.add('active');
            const targetId = targetButton.dataset.target;
            const targetPanel = pane3.querySelector(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    }

    console.log("Dashboard initialization complete.");
});