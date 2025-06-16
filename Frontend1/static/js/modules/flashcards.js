//
// FILE: Frontend1/static/js/modules/flashcards.js (State-Driven Refactor)
//
let state = null;
let renderApp = null;
const API_BASE_URL = '/api/v1';

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
    const flipClass = isFlipped ? 'is-flipped' : '';
    const ratingButtonsHidden = isFlipped ? '' : 'hidden';
    const flipButtonDisplay = isFlipped ? 'style="display: none;"' : '';

    return `
        <div class="flashcard ${flipClass}" data-action="flip">
            <div class="flashcard-inner">
                <div class="flashcard-front"><p>${card.front_text}</p></div>
                <div class="flashcard-back"><p>${card.back_text || '(No back text)'}</p></div>
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
    const dropdown = document.getElementById('deck-menu-dropdown');
    const container = document.getElementById('flashcard-container');
    if (!dropdown || !container) return;

    // Render Deck Selector
    dropdown.innerHTML = state.flashcards.decks.length > 0
        ? state.flashcards.decks.map(DeckLinkComponent).join('')
        : '<p style="padding: 8px 12px;">No decks found.</p>';

    // Render Main Content
    if (state.flashcards.isLoading) {
        container.innerHTML = PlaceholderComponent(`Loading deck: ${state.flashcards.activeDeckName}...`);
    } else if (state.flashcards.sessionComplete) {
        container.innerHTML = SessionCompleteComponent();
    } else if (state.flashcards.cards.length > 0) {
        container.innerHTML = FlashcardComponent();
    } else {
        container.innerHTML = PlaceholderComponent('Select a deck to begin.');
    }
}

// --- Event Handling and State Changes ---

export function initializeFlashcardsFeature(appState, mainRenderCallback) {
    state = appState;
    renderApp = mainRenderCallback;
    initializeState();

    document.getElementById('deck-menu-button').addEventListener('click', () => {
        document.getElementById('deck-menu-dropdown').classList.toggle('hidden');
    });

    document.getElementById('flashcard-view-container').addEventListener('click', handleFlashcardEvents);

    fetchDecks();
}

async function handleFlashcardEvents(event) {
    const deckId = event.target.dataset.deckId;
    const deckName = event.target.dataset.deckName;
    const action = event.target.dataset.action;

    if (deckId) {
        event.preventDefault();
        await startDeckStudySession(deckId, deckName);
        document.getElementById('deck-menu-dropdown').classList.add('hidden');
    }
    
    if (action === 'flip') {
        state.flashcards.isFlipped = true;
        renderApp();
    } else if (action === 'review-correct' || action === 'review-incorrect') {
        handleFlashcardReview(action);
    } else if (action === 'study-again') {
        await startDeckStudySession(state.flashcards.activeDeckId, state.flashcards.activeDeckName);
    }
}

async function fetchDecks() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${state.userId}/stacks`);
        state.flashcards.decks = await response.json();
        renderApp();
    } catch (e) { console.error("Failed to fetch decks:", e); }
}

async function startDeckStudySession(deckId, deckName) {
    state.flashcards.activeDeckId = deckId;
    state.flashcards.activeDeckName = deckName;
    state.flashcards.isLoading = true;
    renderApp();
    try {
        const response = await fetch(`${API_BASE_URL}/users/${state.userId}/stacks/${deckId}/flashcards`);
        const cards = await response.json();
        state.flashcards.cards = cards.sort(() => Math.random() - 0.5);
        state.flashcards.currentCardIndex = 0;
        state.flashcards.isFlipped = false;
        state.flashcards.sessionComplete = cards.length === 0;
    } catch (e) {
        console.error("Could not load deck:", e);
        state.flashcards.cards = [];
    }
    state.flashcards.isLoading = false;
    renderApp();
}

function handleFlashcardReview(outcome) {
    if (state.flashcards.currentCardIndex < state.flashcards.cards.length - 1) {
        state.flashcards.currentCardIndex++;
        state.flashcards.isFlipped = false;
    } else {
        state.flashcards.sessionComplete = true;
    }
    renderApp();
}