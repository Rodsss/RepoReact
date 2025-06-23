// /static/js/modules/collections.js (FINAL, CORRECTED ES MODULE VERSION)

// --- DOM Elements ---
const listsContainer = document.getElementById('lists-container');
const addListBtn = document.getElementById('add-list-btn');
const listActionsContainer = document.getElementById('list-actions-container');
const newListInput = document.getElementById('new-list-input');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');

// --- State ---
let listsData = [
  { name: "Fruits", words: ["Apple", "Banana", "Cherry", "Date", "Fig"] },
  { name: "Animals", words: ["Dog", "Cat", "Elephant", "Lion", "Tiger"] }
];
let activeListIndex = -1;
// Note: selectedWords state is no longer needed for left-click, but will be used by the context menu
let selectedWords = new Set(); 

// --- RENDER Function ---
const render = () => {
  listsContainer.innerHTML = '';
  listsData.forEach((list, listIndex) => {
    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group';
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item';
      listItem.textContent = list.name;
      listItem.dataset.index = listIndex;
      listItem.dataset.listName = list.name; // <-- ADD THIS LINE
      if (listIndex === activeListIndex) {
        listItem.classList.add('active');
      }
      listGroup.appendChild(listItem);
// ...
// ...

    const wordList = document.createElement('ul');
    wordList.className = 'word-list';
    list.words.forEach((word, wordIndex) => {
      const wordItem = document.createElement('li');
      wordItem.className = 'word-item';
      const wordId = `${listIndex}-${wordIndex}`;
      wordItem.dataset.wordId = wordId;
      // We keep this for future use with the context menu, but left-click won't use it
      if (selectedWords.has(wordId)) {
        wordItem.classList.add('is-selected');
      }
      const wordText = document.createElement('span');
      wordText.className = 'word-text';
      wordText.textContent = word;
      wordItem.appendChild(wordText);
      wordList.appendChild(wordItem);
    });
    listGroup.appendChild(wordList);
    listsContainer.appendChild(listGroup);
  });
  deleteSelectedBtn.disabled = true; // Disabled as selection is now done via right-click
};

// --- Event Handlers ---
const setupEventListeners = () => {
  addListBtn.addEventListener('click', () => {
    listActionsContainer.classList.toggle('hidden');
    if (!listActionsContainer.classList.contains('hidden')) {
      newListInput.focus();
    }
  });

  newListInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const listName = newListInput.value.trim();
        if (listName) {
            listsData.push({ name: listName, words: [] });
            newListInput.value = '';
            listActionsContainer.classList.add('hidden');
            render();
        }
    }
  });

  // Simplified Left-Click: Only handles expanding/collapsing lists.
  listsContainer.addEventListener('click', (event) => {
    const listItem = event.target.closest('.list-group-item');
    if (listItem) {
      const index = parseInt(listItem.dataset.index, 10);
      activeListIndex = (activeListIndex === index) ? -1 : index;
      render();
    }
  });
};

// --- Public API ---
const init = () => {
  render();
  setupEventListeners();
};

const getLists = () => listsData.map(list => list.name);

const addWordToList = (word, listName) => {
  const list = listsData.find(l => l.name === listName);
  if (list && !list.words.includes(word)) {
    list.words.push(word);
    render();
    return true;
  }
  return false;
};

// This creates the module object...
const CollectionsModule = { init, getLists, addWordToList };

// ...and this EXPORTS it correctly, making it a true ES Module.
export default CollectionsModule;