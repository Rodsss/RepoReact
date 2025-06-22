/**
 * =============================================================================
 * flashcards.js - FINAL CORRECTED VERSION
 * * Module for the "Flashcards" tab in Pane 3.
 *
 * NOTE: The API calls in this file are currently MOCKED for frontend development.
 * This version corrects the data lookup for starting a session.
 * =============================================================================
 */

import { fetchWithAuth } from "../services/apiService.js";

let state = null;
let renderApp = null;

// --- State Initializer ---
function initializeState() {
  if (!state.flashcards) {
    state.flashcards = {
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

function DeckLinkComponent(deck) {
  return `<a href="#" data-deck-id="${deck.stack_id}" data-deck-name="${deck.stack_name}">${deck.stack_name}</a>`;
}

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
            <button id="flip-card-btn" class="btn-base btn-custom-outline" data-action="flip" ${flipButtonDisplay}>Flip</button>
            <div id="rating-buttons" class="${ratingButtonsHidden}">
                <button class="btn-base btn-custom-danger" data-action="review-incorrect">Incorrect</button>
                <button class="btn-base btn-custom-outline" data-action="review-correct">Correct</button>
            </div>
        </div>
        <div class="flashcard-progress">Card ${currentCardIndex + 1} of ${cards.length}</div>
    `;
}

function PlaceholderComponent(message) {
  return `<div class="flashcard-placeholder"><p>${message}</p></div>`;
}

function SessionCompleteComponent() {
  return `
        <div class="flashcard-placeholder">
            <p>🎉 Session complete!</p>
            <button class="btn-base btn-custom-outline" data-action="study-again">Study Again</button>
        </div>
    `;
}

// --- Main Rendering Logic ---

export function renderFlashcards() {
  if (!state) return;

  const dropdown = document.getElementById("deck-menu-dropdown");
  const container = document.getElementById("flashcard-container");
  if (!dropdown || !container) return;

  dropdown.innerHTML =
    state.flashcards.decks.length > 0
      ? state.flashcards.decks.map(DeckLinkComponent).join("")
      : '<p style="padding: 8px 12px;">No decks found.</p>';

  if (state.flashcards.isLoading) {
    container.innerHTML = PlaceholderComponent(`Loading deck: ${state.flashcards.activeDeckName}...`);
  } else if (state.flashcards.sessionComplete) {
    container.innerHTML = SessionCompleteComponent();
  } else if (state.flashcards.cards && state.flashcards.cards.length > 0) {
    container.innerHTML = FlashcardComponent();
  } else {
    container.innerHTML = PlaceholderComponent("Select a deck to begin.");
  }
}

// --- Event Handling and State Changes ---

export function initializeFlashcardsFeature(appState, mainRenderCallback) {
  state = appState;
  renderApp = mainRenderCallback;
  initializeState();

  document.getElementById("deck-menu-button").addEventListener("click", () => {
    document.querySelector(".action-dropdown").classList.toggle("hidden");
  });

  document.getElementById("flashcard-view-container").addEventListener("click", handleFlashcardEvents);

  fetchDecks();
}

async function handleFlashcardEvents(event) {
    const deckLink = event.target.closest('[data-deck-id]');
    const actionTarget = event.target.closest('[data-action]');

    if (deckLink) {
        event.preventDefault();
        const deckId = deckLink.dataset.deckId;
        const deckName = deckLink.dataset.deckName;
        await startDeckStudySession(deckId, deckName);
        document.querySelector(".action-dropdown").classList.add("hidden");
        return;
    }

    if (actionTarget) {
        const action = actionTarget.dataset.action;
        if (action === "flip") {
            state.flashcards.isFlipped = true;
            renderApp();
        } else if (action === "review-correct" || action === "review-incorrect") {
            handleFlashcardReview(action);
        } else if (action === "study-again") {
            await startDeckStudySession(state.flashcards.activeDeckId, state.flashcards.activeDeckName);
        }
    }
}

// This function now correctly accepts the 'outcome' argument
function handleFlashcardReview(outcome) {
  console.log(`Card reviewed as: ${outcome}`); // For future use
  if (state.flashcards.currentCardIndex < state.flashcards.cards.length - 1) {
    state.flashcards.currentCardIndex++;
    state.flashcards.isFlipped = false;
  } else {
    state.flashcards.sessionComplete = true;
  }
  renderApp();
}

// --- MOCKED API FUNCTIONS ---

async function fetchDecks() {
    console.log("MOCK: Fetching decks for user:", state.userId);
    const mockDecks = [
        { stack_id: "1", stack_name: "Spanish Vocabulary" },
        { stack_id: "2", stack_name: "Technical Terms" },
        { stack_id: "3", stack_name: "Project Acronyms (Empty)" }
    ];
    state.flashcards.decks = mockDecks;
    renderApp();
}

async function startDeckStudySession(deckId, deckName) {
    state.flashcards.activeDeckId = deckId;
    state.flashcards.activeDeckName = deckName;
    state.flashcards.isLoading = true;
    renderApp();
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockCards = {
        "1": [
            { card_id: 101, front_text: "Hola", back_text: "Hello" },
            { card_id: 102, front_text: "Adiós", back_text: "Goodbye" },
            { card_id: 103, front_text: "Gracias", back_text: "Thank you" }
        ],
        "2": [
            { card_id: 201, front_text: "API", back_text: "Application Programming Interface" },
            { card_id: 202, front_text: "JSON", back_text: "JavaScript Object Notation" }
        ],
        "3": []
    };

    const cards = mockCards[deckId] || [];
    state.flashcards.cards = [...cards].sort(() => Math.random() - 0.5); // Use spread to avoid mutating mock
    state.flashcards.currentCardIndex = 0;
    state.flashcards.isFlipped = false;
    state.flashcards.sessionComplete = cards.length === 0;

    state.flashcards.isLoading = false;
    renderApp();
}