// FILE: frontend-react/src/pages/NotesPage.jsx

import React, { useState, useEffect } from 'react';
import FolderList from "../components/FolderList.jsx";
import NoteEditor from "../components/NoteEditor.jsx";
import * as api from '../api.js';
import '../App.css';

// The component is now correctly named NotesPage
function NotesPage() {
    const [folders, setFolders] = useState([]);
    const [notesByFolder, setNotesByFolder] = useState({});
    const [activeNote, setActiveNote] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');

    useEffect(() => {
        async function getInitialData() {
            const fetchedFolders = await api.fetchFolders();
            setFolders(fetchedFolders);
            if (fetchedFolders.length > 0) {
              const notePromises = fetchedFolders.map(folder => api.fetchNotesByFolderId(folder.folder_id));
              const allNotes = await Promise.all(notePromises);
              const notesMap = {};
              allNotes.forEach((notes, index) => {
                  const folderId = fetchedFolders[index].folder_id;
                  notesMap[folderId] = notes;
              });
              setNotesByFolder(notesMap);
            }
        }
        getInitialData().catch(console.error);
    }, []);

    async function handleSelectNote(noteId) {
        let noteInfo;
        for (const folderId in notesByFolder) {
            const found = notesByFolder[folderId].find(n => n.note_id === noteId);
            if (found) { noteInfo = found; break; }
        }
        const { content } = await api.fetchNoteContent(noteId);
        setActiveNote({ ...noteInfo, content: content || "" });
    }

    async function handleAddFolder(event) {
        event.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const newFolder = await api.createFolder(newFolderName);
            setFolders([...folders, newFolder]);
            setNewFolderName('');
        } catch (error) {
            console.error("Failed to create folder:", error);
            alert("Error: Could not create folder.");
        }
    }

    function handleNewNote(folderId) {
      setActiveNote({
        note_id: null,
        title: 'New Note',
        content: '',
        folder_id: folderId,
      });
    }

    function handleNoteChange(updatedNote) {
      setActiveNote(updatedNote);
    }



    async function handleSaveNote() {
      if (!activeNote) return;
      try {
        const savedNote = await api.saveNote(activeNote, activeNote.note_id);
        const newNotesByFolder = { ...notesByFolder };
        const notesInFolder = newNotesByFolder[savedNote.folder_id] || [];
        const noteIndex = notesInFolder.findIndex(n => n.note_id === savedNote.note_id);
        
        if (noteIndex > -1) {
          notesInFolder[noteIndex] = savedNote;
        } else {
          notesInFolder.push(savedNote);
        }
        
        newNotesByFolder[savedNote.folder_id] = notesInFolder;
        setNotesByFolder(newNotesByFolder);
        setActiveNote(savedNote);
        alert('Note saved!');

      } catch (error) {
        console.error("Failed to save note:", error);
        alert("Error: Could not save note.");
      }
    }

    return (
        <div className="app-container">
            <FolderList
                folders={folders}
                notesByFolder={notesByFolder}
                onSelectNote={handleSelectNote}
                activeNoteId={activeNote ? activeNote.note_id : null}
                onAddFolder={handleAddFolder}
                newFolderName={newFolderName}
                onNewFolderNameChange={(e) => setNewFolderName(e.target.value)}
                onNewNote={handleNewNote}
            />
            <NoteEditor
                activeNote={activeNote}
                onNoteChange={handleNoteChange}
                onSaveNote={handleSaveNote}
            />
        </div>
    );
}

export default NotesPage;