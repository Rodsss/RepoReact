import './NoteEditor.css';

// Receives the currently active note object as a prop
function NoteEditor({ activeNote }) {
  if (!activeNote) {
    return (
      <div className="note-editor-container placeholder">
        Select a note to view its content.
      </div>
    );
  }

  return (
    <div className="note-editor-container">
      <input type="text" value={activeNote.title} readOnly className="note-title-input" />
      <div
        className="note-content-area"
        dangerouslySetInnerHTML={{ __html: activeNote.content }} // Used to render HTML content
      />
    </div>
  );
}

export default NoteEditor;