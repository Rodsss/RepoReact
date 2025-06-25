// FILE: frontend-react/src/api.js (Corrected)

import apiFetch from './apiService.js';

// --- Note Functions ---

export function fetchFolders() {
  return apiFetch('/notes/folders/');
}

export function fetchNotesByFolderId(folderId) {
  return apiFetch(`/notes/folders/${folderId}/notes/`);
}

export function fetchNoteContent(noteId) {
  return apiFetch(`/notes/${noteId}/`);
}

export function createFolder(folderName) {
  return apiFetch('/notes/folders/', {
    method: 'POST',
    body: JSON.stringify({ folder_name: folderName }),
  });
}

export function saveNote(noteData, noteId) {
  const endpoint = noteId ? `/notes/${noteId}/` : '/notes/';
  const method = noteId ? 'PUT' : 'POST';

  return apiFetch(endpoint, {
    method: method,
    body: JSON.stringify(noteData),
  });
}

// --- Flashcard Functions ---

// --- Flashcard & Collection Functions (Corrected Paths) ---

export function fetchDecks() {
  // This likely points to the root of your collections router
  return apiFetch('/collections/');
}

export function fetchCardsForDeck(deckId) {
  // Cards for a collection would be a sub-resource
  return apiFetch(`/collections/${deckId}/cards/`);
}

export function createDeck(deckName) {
  // Creating a new collection
  return apiFetch('/collections/', {
    method: 'POST',
    body: JSON.stringify({ stack_name: deckName }),
  });
}

export function createCard(deckId, cardData) {
  // Creating a new card inside a collection
  return apiFetch(`/collections/${deckId}/cards/`, {
    method: 'POST',
    body: JSON.stringify(cardData),
  });
}



// Add this function to frontend-react/src/api.js



// Add this function to frontend-react/src/api.js



// Add this function back to frontend-react/src/api.js

export function register(email, password) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  // Registration does not require an auth token, so we use fetch directly.
  return fetch(`${baseUrl}/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

// Add this function to frontend-react/src/api.js

export function translateText(text, targetLang = 'en') {
  // This corresponds to the TranslateRequest schema in your backend
  return apiFetch('/translation/', {
    method: 'POST',
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
}

// Add this function to frontend-react/src/api.js

export function searchMedia(query) {
  // We use URLSearchParams to correctly format the query for a GET request
  const params = new URLSearchParams({ q: query });
  return apiFetch(`/media_search/?${params.toString()}`);
}