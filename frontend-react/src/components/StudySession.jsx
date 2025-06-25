// FILE: frontend-react/src/components/StudySession.jsx (Upgraded)
import React, { useState } from 'react';
import Flashcard from './Flashcard.jsx';
import './StudySession.css'; // We'll create this CSS file

function StudySession({ cards, onSessionEnd }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards || cards.length === 0) {
    return (
      <div className="study-session-container">
        <div className="placeholder-message">
          <h3>All Done!</h3>
          <p>This deck has no cards to study.</p>
          <button onClick={onSessionEnd} className="btn-primary">Back to Decks</button>
        </div>
      </div>
    );
  }

  // This function handles moving to the next card after a review
  const handleReview = (outcome) => {
    console.log(`Card ${cards[currentCardIndex].flashcard_id} reviewed as: ${outcome}`);
    // In a real app, you would send this outcome to the backend here.

    if (currentCardIndex >= cards.length - 1) {
      // If it's the last card, end the session
      onSessionEnd();
    } else {
      // Otherwise, move to the next card and flip it back to the front
      setIsFlipped(false);
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const currentCard = cards[currentCardIndex];

  return (
    <div className="study-session-container">
      {/* The Flashcard itself is now just a view */}
      <Flashcard card={currentCard} isFlipped={isFlipped} />

      <div className="study-controls">
        {/* --- NEW: Conditional rendering for the controls --- */}
        {!isFlipped ? (
          // If card is not flipped, show a single "Show Answer" button
          <button onClick={() => setIsFlipped(true)} className="btn-primary show-answer-btn">
            Show Answer
          </button>
        ) : (
          // If card IS flipped, show the rating buttons
          <div className="rating-buttons">
            <button onClick={() => handleReview('Incorrect')} className="btn-danger">
              Again
            </button>
            <button onClick={() => handleReview('Correct')} className="btn-success">
              Good
            </button>
          </div>
        )}
      </div>

      <div className="session-footer">
        <button onClick={onSessionEnd} className="btn-secondary">End Session</button>
        <div className="flashcard-progress">
          Card {currentCardIndex + 1} of {cards.length}
        </div>
      </div>
    </div>
  );
}

export default StudySession;