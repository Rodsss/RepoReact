// /static/js/modules/flashcards.js (FINAL, COMPLETE, and CORRECTED)

import { fetchWithAuth } from "../services/apiService.js";

let state = null;
let renderApp = null;

// --- State Initializer ---
function initializeState() {
  if (!state.flashcards) {
    state.flashcards = {
      currentView: 'dashboard', // 'dashboard' or 'session'
      decks: [],
      activeDeckId: null,
      activeDeckName: null,
      cards: [],
      currentCardIndex: 0,
      isFlipped: false,
      sessionComplete: false,
      isLoading: false,
    };
  }
}

// --- Component Functions ---

// Creates a single list item for the dashboard view
function DeckListItemComponent(deck) {
    return `
        <div class="deck-list-item" data-action="study-deck" data-deck-id="${deck.stack_id}" data-deck-name="${deck.stack_name}">
            <span class="deck-list-name">${deck.stack_name}</span>
            <span class="deck-list-stats">
                <strong>${deck.stats.due_for_review} due</strong> / ${deck.stats.total_cards} total
            </span>
        </div>
    `;
}

// Creates the entire dashboard view
function DeckDashboardComponent() {
    const { decks, isLoading } = state.flashcards;
    const listContainer = document.getElementById('deck-list-container');
    if (!listContainer) return '';

    if (isLoading) {
        listContainer.innerHTML = `<p>Loading decks...</p>`;
    } else if (decks.length === 0) {
        listContainer.innerHTML = `<p>No decks found. Create one to get started!</p>`;
    } else {
        listContainer.innerHTML = decks.map(DeckListItemComponent).join('');
    }
    // The dashboard view itself is part of the static HTML, we just render the list into it
}

// Creates the full-screen study session view
// In /static/js/modules/flashcards.js
// In /static/js/modules/flashcards.js
// In /static/js/modules/flashcards.js

function StudySessionComponent() {
    const { cards, sessionComplete } = state.flashcards;

    let content;
    if (sessionComplete) {
        content = SessionCompleteComponent();
    } else if (cards && cards.length > 0) {
        content = FlashcardComponent();
    } else {
        content = PlaceholderComponent("This deck has no cards to study.");
    }

    // The old .study-session-header is now replaced with .study-session-footer
    return `
        <div class="study-session-view">
            ${content}

            <div class="study-session-footer">
                <button class="btn-base btn-secondary btn-small" data-action="show-decks">Decks</button>
                <button class="btn-base btn-secondary btn-small" data-action="study-options">
                    <i class="bi bi-gear-fill"></i> Options
                </button>
            </div>
        </div>
    `;
}

// Creates the flipping flashcard element
// In /static/js/modules/flashcards.js

function FlashcardComponent() {
    const { cards, currentCardIndex, isFlipped } = state.flashcards;
    const card = cards[currentCardIndex];
    const flipClass = isFlipped ? "is-flipped" : "";
    const ratingButtonsHidden = isFlipped ? "" : "hidden";
    const flipButtonDisplay = isFlipped ? 'style="display: none;"' : "";

    return `
        <div class="flashcard ${flipClass}" data-action="flip">
            <div class="flashcard-inner">
                <div class="flashcard-front"><p>${card.front_text}</p></div>
                <div class="flashcard-back"><p>${card.back_text || "(No back text)"}</p></div>
            </div>
        </div>
        <div class="flashcard-controls">
            <button id="flip-card-btn" class="btn-base btn-primary" data-action="flip" ${flipButtonDisplay}>Ready</button>
            <div id="rating-buttons" class="${ratingButtonsHidden}">
                <button class="btn-base btn-danger" data-action="review-incorrect">Good</button>
                <button class="btn-base btn-secondary" data-action="review-correct">Improve</button>
            </div>
        </div>
        <div class="flashcard-progress">Card ${currentCardIndex + 1} of ${cards.length}</div>
    `;
}

// Creates a placeholder message (e.g., "Loading...")
function PlaceholderComponent(message) {
    return `<div class="flashcard-placeholder"><p>${message}</p></div>`;
}

// Creates the "Session Complete" message
function SessionCompleteComponent() {
    return `
        <div class="flashcard-placeholder">
            <p>🎉 All Done!</p>
            <button class="btn-base btn-primary" data-action="study-again">Study Again</button>
        </div>
    `;
}

// --- Main Rendering Logic (Router) ---
export function renderFlashcards() {
  if (!state) return;

  const dashboardWrapper = document.getElementById('deck-dashboard-wrapper');
  const sessionWrapper = document.getElementById('study-session-wrapper');
  if (!dashboardWrapper || !sessionWrapper) return;

  // This is the new, simple routing logic
  if (state.flashcards.currentView === 'dashboard') {
    dashboardWrapper.classList.remove('hidden');
    sessionWrapper.classList.add('hidden');
    // Re-render the deck list in case it has changed
    DeckDashboardComponent();
  } else { // 'session' view
    dashboardWrapper.classList.add('hidden');
    sessionWrapper.classList.remove('hidden');
    // Render the study session content into its wrapper
    sessionWrapper.innerHTML = StudySessionComponent();
  }
}

// --- Event Handling & State Changes ---
export function initializeFlashcardsFeature(appState, mainRenderCallback) {
  state = appState;
  renderApp = mainRenderCallback;
  initializeState();

  const addDeckBtn = document.getElementById('add-deck-btn');
  const newDeckInputContainer = document.getElementById('new-deck-input-container');
  const newDeckInput = document.getElementById('new-deck-input');

  addDeckBtn.addEventListener('click', () => {
      newDeckInputContainer.classList.toggle('hidden');
      if (!newDeckInputContainer.classList.contains('hidden')) {
          newDeckInput.focus();
      }
  });

  newDeckInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
          const deckName = newDeckInput.value.trim();
          if (deckName) {
              console.log("MOCK: Creating deck:", deckName);
              const newDeck = {
                  stack_id: Date.now().toString(),
                  stack_name: deckName,
                  stats: { total_cards: 0, due_for_review: 0 }
              };
              state.flashcards.decks.push(newDeck);
              newDeckInput.value = '';
              newDeckInputContainer.classList.add('hidden');
              renderApp();
          }
      }
  });
  
  // Attach one main event listener to the entire flashcard tab container
  document.getElementById('flashcard-view-container').addEventListener('click', handleFlashcardEvents);
  
  fetchDecks();
}

// In /static/js/modules/flashcards.js

async function handleFlashcardEvents(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    // This switch statement is now simplified
    switch(action) {
        case 'study-deck':
            const { deckId, deckName } = target.dataset;
            await startDeckStudySession(deckId, deckName);
            break;
        case 'show-decks':
            state.flashcards.currentView = 'dashboard';
            renderApp();
            break;
        case 'flip':
            // --- THIS IS THE NEW DIRECT FIX ---
            // Manually find the card and add the class to trigger the animation.
            document.querySelector('.flashcard')?.classList.add('is-flipped');
            // We also hide the 'Ready' button and show the rating buttons directly.
            document.getElementById('flip-card-btn').style.display = 'none';
            document.getElementById('rating-buttons').classList.remove('hidden');
            break;
        case 'review-correct':
        case 'review-incorrect':
            handleFlashcardReview(action);
            break;
        case 'study-again':
            await startDeckStudySession(state.flashcards.activeDeckId, state.flashcards.activeDeckName);
            break;
    }
}


function handleFlashcardReview(outcome) {
  // First, update the state for the next card
  if (state.flashcards.currentCardIndex < state.flashcards.cards.length - 1) {
    state.flashcards.currentCardIndex++;
    state.flashcards.isFlipped = false; // Reset the flip state for the new card
  } else {
    state.flashcards.sessionComplete = true;
  }

  // THEN, trigger a full re-render of the app to show the new card state
  renderApp();
}

// --- Data Fetching and Session Logic (Mocks) ---
async function fetchDecks() {
    state.flashcards.isLoading = true;
    renderApp();
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockDecks = [
        { stack_id: "1", stack_name: "Spanish Vocabulary", stats: { total_cards: 50, due_for_review: 12 } },
        { stack_id: "2", stack_name: "Technical Terms", stats: { total_cards: 25, due_for_review: 5 } },
        { stack_id: "3", stack_name: "Project Acronyms", stats: { total_cards: 15, due_for_review: 0 } },
    ];
    state.flashcards.decks = mockDecks;
    state.flashcards.isLoading = false;
    renderApp();
}

async function startDeckStudySession(deckId, deckName) {
    state.flashcards.activeDeckId = deckId;
    state.flashcards.activeDeckName = deckName;
    state.flashcards.isLoading = true;
    state.flashcards.currentView = 'session';
    renderApp();
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockCards = {
        "1": [ { card_id: 101, front_text: "Hola", back_text: "Hello" }, { card_id: 102, front_text: "Adiós", back_text: "Goodbye" }, { card_id: 103, front_text: "Gracias", back_text: "Thank you" } ],
        "2": [ { card_id: 201, front_text: "API", back_text: "Application Programming Interface" }, { card_id: 202, front_text: "JSON", back_text: "JavaScript Object Notation" } ],
        "3": []
    };

    const cards = mockCards[deckId] || [];
    state.flashcards.cards = [...cards].sort(() => Math.random() - 0.5);
    state.flashcards.currentCardIndex = 0;
    state.flashcards.isFlipped = false;
    state.flashcards.sessionComplete = cards.length === 0;
    state.flashcards.isLoading = false;
    renderApp();
}