import React, { useState, useEffect } from 'react';
import * as api from '../api.js';
import DeckListItem from '../components/DeckListItem.jsx';
import StudySession from '../components/StudySession.jsx';
import AddCardModal from '../components/AddCardModal.jsx'; // Import the new modal
import '../components/Flashcard.css';

function FlashcardsPage() {
  const [decks, setDecks] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeSession, setActiveSession] = useState({ deckId: null, cards: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [newDeckName, setNewDeckName] = useState('');
  
  // --- NEW: State to manage the modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState(null);

  useEffect(() => {
    api.fetchDecks()
      .then(fetchedDecks => {
        const decksWithStats = fetchedDecks.map(d => ({...d, stats: { total_cards: 'N/A', due_for_review: 'N/A'}}));
        setDecks(decksWithStats);
      })
      .catch(err => console.error("Failed to fetch decks:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const startStudySession = async (deckId) => {
    try {
      const cards = await api.fetchCardsForDeck(deckId);
      setActiveSession({ deckId, cards });
      setCurrentView('session');
    } catch (error) {
      console.error("Failed to start study session:", error);
      alert("Error: Could not load cards for this deck.");
    }
  };

  const handleCreateDeck = async (event) => {
    event.preventDefault();
    if (!newDeckName.trim()) return;
    try {
      const newDeckData = await api.createDeck(newDeckName);
      const newDeckWithStats = {...newDeckData, stats: { total_cards: 0, due_for_review: 0 }};
      setDecks([...decks, newDeckWithStats]);
      setNewDeckName('');
    } catch (error) {
      console.error("Failed to create deck:", error);
      alert("Error: Could not create deck.");
    }
  };

  // --- NEW: Handlers for the modal ---
  const openAddCardModal = (deckId) => {
    setSelectedDeckId(deckId);
    setIsModalOpen(true);
  };

  const handleCardSave = async (cardData, deckId) => {
    try {
      await api.createCard(deckId, cardData);
      alert('Card saved successfully!');
      setIsModalOpen(false); // Close the modal on success
      // Note: A more advanced version would update the card count here.
    } catch (error) {
      console.error("Failed to save card:", error);
      alert("Error: Could not save card.");
    }
  };

  if (isLoading) {
    return <div>Loading Flashcard Decks...</div>;
  }
  
  if (currentView === 'session') {
    return <StudySession cards={activeSession.cards} onSessionEnd={() => setCurrentView('dashboard')} />;
  }

  return (
    <div>
      <h2>Flashcard Decks</h2>
      <form onSubmit={handleCreateDeck} className="add-folder-form" style={{marginBottom: '20px'}}>
        <input
          type="text"
          className="add-folder-input"
          placeholder="New Deck Name"
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
        />
        <button type="submit" className="add-folder-button">+</button>
      </form>

      <div id="deck-list-container">
        {decks.length === 0 ? (
          <p>No decks found. Create one to get started!</p>
        ) : (
          decks.map(deck => (
            // We modify DeckListItem to include buttons, so let's build it here
            <div key={deck.stack_id} className="deck-list-item-container">
              <DeckListItem deck={deck} />
              <div className="deck-actions">
                <button className="btn-secondary" onClick={() => openAddCardModal(deck.stack_id)}>Add Card</button>
                <button className="btn-primary" onClick={() => startStudySession(deck.stack_id)}>Study</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- NEW: Conditionally render the modal --- */}
      {isModalOpen && (
        <AddCardModal
          deckId={selectedDeckId}
          onSave={handleCardSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default FlashcardsPage;