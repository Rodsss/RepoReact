// State and constants scoped to the flashcards module
let state = null; // Will hold the global appState
let flashcardDeck = [];
let currentCardIndex = 0;
const API_BASE_URL = '/api/v1';

/**
 * Main initializer for the Flashcards feature.
 * @param {object} appState The global application state.
 */
export function initializeFlashcardsFeature(appState) {
    state = appState;
    if (!document.getElementById('flashcard-view-container').classList.contains('hidden')) {
        populateDeckSelectorMenu();
    }
}

async function populateDeckSelectorMenu() {
    const dropdown = document.getElementById('deck-menu-dropdown');
    try {
        // Use the userId from the global state
        const response = await fetch(`${API_BASE_URL}/users/${state.userId}/stacks`);
        const stacks = await response.json();
        dropdown.innerHTML = '';
        if (stacks.length > 0) {
            stacks.forEach(stack => {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = stack.stack_name;
                link.addEventListener('click', e => {
                    e.preventDefault();
                    startDeckStudySession(stack.stack_id, stack.stack_name);
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(link);
            });
        } else { dropdown.innerHTML = '<p style="padding: 8px 12px;">No decks found.</p>'; }
        document.getElementById('deck-menu-button').addEventListener('click', () => dropdown.classList.toggle('hidden'));
    } catch (error) { console.error("Failed to fetch decks:", error); }
}

async function startDeckStudySession(deckId, deckName) {
    const container = document.getElementById('flashcard-container');
    container.innerHTML = `<p>Loading deck: <strong>${deckName}</strong>...</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${state.userId}/stacks/${deckId}/flashcards`);
        flashcardDeck = await response.json();
        if (flashcardDeck.length === 0) {
            container.innerHTML = `<div class="flashcard-placeholder"><p>This deck is empty.</p></div>`;
            return;
        }
        flashcardDeck.sort(() => Math.random() - 0.5);
        currentCardIndex = 0;
        renderCurrentFlashcard();
    } catch (error) { container.innerHTML = '<p class="error-message">Could not load deck.</p>'; }
}

function renderCurrentFlashcard() {
    const container = document.getElementById('flashcard-container');
    if (currentCardIndex >= flashcardDeck.length) {
        container.innerHTML = `<div class="flashcard-placeholder"><p>🎉 Session complete!</p><button id="restart-flashcards">Study Again</button></div>`;
        document.getElementById('restart-flashcards').addEventListener('click', () => startDeckStudySession(flashcardDeck[0].stack_id, "this deck"));
        return;
    }
    const card = flashcardDeck[currentCardIndex];
    container.innerHTML = `
        <div class="flashcard"><div class="flashcard-inner">
            <div class="flashcard-front"><p>${card.front_text}</p></div>
            <div class="flashcard-back"><p>${card.back_text || '(No back text)'}</p></div>
        </div></div>
        <div class="flashcard-controls"><button id="flip-card-btn">Flip</button><div id="rating-buttons" class="hidden"><button id="incorrect-btn" class="danger-button">Incorrect</button><button id="correct-btn">Correct</button></div></div>
        <div class="flashcard-progress">Card ${currentCardIndex + 1} of ${flashcardDeck.length}</div>`;
    
    document.getElementById('flip-card-btn').addEventListener('click', (e) => {
        e.target.closest('.flashcard-controls').previousElementSibling.classList.toggle('is-flipped');
        document.getElementById('rating-buttons').classList.remove('hidden');
        e.target.style.display = 'none';
    });
    document.getElementById('correct-btn').addEventListener('click', () => handleFlashcardReview('correct'));
    document.getElementById('incorrect-btn').addEventListener('click', () => handleFlashcardReview('incorrect'));
}

async function handleFlashcardReview(outcome) {
    currentCardIndex++;
    renderCurrentFlashcard();
}