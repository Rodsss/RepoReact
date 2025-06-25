import './Flashcard.css'; // We will create this file next

// This component receives the card data and whether it's flipped as props.
function Flashcard({ card, isFlipped }) {
  return (
    // The 'is-flipped' class will be added or removed based on the isFlipped prop
    <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}>
      <div className="flashcard-inner">
        <div className="flashcard-front">
          <p>{card.front_text}</p>
        </div>
        <div className="flashcard-back">
          <p>{card.back_text || "(No back text)"}</p>
        </div>
      </div>
    </div>
  );
}

export default Flashcard;