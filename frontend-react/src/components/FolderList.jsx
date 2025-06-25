import './FolderList.css';

function FolderList({
  folders,
  notesByFolder,
  onSelectNote,
  activeNoteId,
  onAddFolder,
  newFolderName,
  onNewFolderNameChange,
}) {
  return (
    <div className="folder-list-container">
      <h2>Folders</h2>

      <form onSubmit={onAddFolder} className="add-folder-form">
        <input
          type="text"
          placeholder="New Folder Name"
          value={newFolderName}
          onChange={onNewFolderNameChange}
          className="add-folder-input"
        />
        <button type="submit" className="add-folder-button">+</button>
      </form>

      {/* The list of folders will be rendered here */}
      {folders.map((folder) => (
        <div key={folder.folder_id} className="folder-item">
          <div className="folder-header">{folder.folder_name}</div>
          <div className="notes-list">
            {(notesByFolder[folder.folder_id] || []).map((note) => (
              <a
                key={note.note_id}
                href="#"
                className={`notes-list-item ${
                  note.note_id === activeNoteId ? 'active' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectNote(note.note_id);
                }}
              >
                {note.title}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FolderList;