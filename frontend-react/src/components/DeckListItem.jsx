// This is a React component. It's a function that returns JSX (HTML-like syntax).
// It receives "props" - data passed from its parent. We destructure to get the 'deck' object directly.
function DeckListItem({ deck }) {
  return (
    // Note: In JSX, the 'class' attribute for CSS must be written as 'className'.
    <div className="deck-list-item">
      <span className="deck-list-name">{deck.stack_name}</span>
      <span className="deck-list-stats">
        <strong>{deck.stats.due_for_review} due</strong> / {deck.stats.total_cards} total
      </span>
    </div>
  );
}

export default DeckListItem;