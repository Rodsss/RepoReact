//
// FILE: Frontend1/static/js/dashboard_app.js (Final Consolidated Version)
//
import { initializeAuthFeature, AuthComponent, logout } from './modules/auth.js';
import { initializeNotesFeature, renderNotes } from './modules/notes.js';
import { initializeCollectionsFeature, CollectionsComponent } from './modules/collections.js';
import { initializeFlashcardsFeature, renderFlashcards } from './modules/flashcards.js';
import { initializeMediaSearchFeature, renderMediaSearch } from './modules/media_search.js';
import { initializeTranslateFeature, TranslateComponent } from './modules/Translate.js';

const state = {
    userId: 'default-user',
    currentView: 'translate',
};

function renderApp() {
    const authContainer = document.getElementById('auth-container');
    const mainAppContainer = document.getElementById('main-app-container');

    if (state.auth && state.auth.isAuthenticated) {
        authContainer.classList.add('hidden');
        mainAppContainer.classList.remove('hidden');
    } else {
        mainAppContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        authContainer.innerHTML = AuthComponent();
        return;
    }

    const viewContainer = document.querySelector('.main-content');
    if (viewContainer) {
        viewContainer.querySelectorAll('.view').forEach(view => {
            view.style.display = 'none';
        });
        const newView = document.getElementById(`${state.currentView}-view`);
        if (newView) {
            newView.style.display = (state.currentView === 'translate') ? 'grid' : 'block';
        }
    }

    const navButtons = document.querySelectorAll('.menu-button[data-view]');
    navButtons.forEach(button => {
        if (button.dataset.view === state.currentView) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    renderNotes();
    renderFlashcards();
    renderMediaSearch();
    TranslateComponent();
    
    const collectionsContainer = document.getElementById('collections-container');
    if (collectionsContainer) {
        collectionsContainer.innerHTML = CollectionsComponent();
    }
}

function initializeApp() {
    const initializeMainFeatures = () => {
        initializeNotesFeature(state, renderApp);
        initializeCollectionsFeature(state, renderApp);
        initializeFlashcardsFeature(state, renderApp);
        initializeMediaSearchFeature(state, renderApp);
        initializeTranslateFeature(state, renderApp);
        renderApp();
    };

    initializeAuthFeature(state, renderApp, initializeMainFeatures);

    document.querySelectorAll('.menu-button[data-view]').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const view = button.dataset.view;
            if (state.currentView !== view) {
                state.currentView = view;
                renderApp();
            }
        });
    });

    const paneOne = document.querySelector('.pane-one');
    if (paneOne) {
        paneOne.addEventListener('click', (event) => {
            const header = event.target.closest('.collapsible-header');
            if (header) {
                header.parentElement.classList.toggle('active');
            }
        });
    }

    document.getElementById('logout-button').addEventListener('click', () => logout(state, renderApp));

    renderApp();
}

document.addEventListener('DOMContentLoaded', initializeApp);