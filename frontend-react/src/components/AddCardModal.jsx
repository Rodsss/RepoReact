// FILE: frontend-react/src/components/AddCardModal.jsx
import React, { useState } from 'react';
import './AddCardModal.css'; // We will create this CSS file

function AddCardModal({ deckId, onSave, onClose }) {
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!frontText.trim()) {
      alert('Front text cannot be empty.');
      return;
    }
    // Call the onSave function passed down from the parent
    onSave({ front_text: frontText, back_text: backText }, deckId);
    // Clear the form for the next time
    setFrontText('');
    setBackText('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Card</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="front_text">Front</label>
            <textarea
              id="front_text"
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              placeholder="Text on the front of the card"
            />
          </div>
          <div className="form-group">
            <label htmlFor="back_text">Back</label>
            <textarea
              id="back_text"
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              placeholder="Text on the back of the card"
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Card</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCardModal;