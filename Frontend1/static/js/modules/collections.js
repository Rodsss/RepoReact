const CollectionsModule = (() => {
  // --- DOM Elements ---
  const listsContainer = document.getElementById('lists-container');
  const addListBtn = document.getElementById('add-list-btn');
  const newListInputContainer = document.getElementById('new-list-input-container');
  const newListInput = document.getElementById('new-list-input');

  // --- State ---
  let listsData = [
    { name: "Fruits", words: ["Apple", "Banana", "Cherry"] },
    { name: "Animals", words: ["Dog", "Cat", "Elephant"] }
  ];
  let activeListIndex = -1;

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
      if (listIndex === activeListIndex) {
        listItem.classList.add('active');
      }
      listGroup.appendChild(listItem);

      const wordList = document.createElement('ul');
      wordList.className = 'word-list';
      list.words.forEach((word, wordIndex) => {
        const wordItem = document.createElement('li');
        wordItem.className = 'word-item';
        wordItem.dataset.listIndex = listIndex;
        wordItem.dataset.wordIndex = wordIndex;
        
        const wordText = document.createElement('span');
        wordText.className = 'word-text';
        wordText.textContent = word;

        const wordActions = document.createElement('div');
        wordActions.className = 'word-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'word-action-btn edit-word-btn';
        editBtn.title = 'Edit word';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'word-action-btn delete-word-btn';
        deleteBtn.title = 'Delete word';

        wordActions.appendChild(editBtn);
        wordActions.appendChild(deleteBtn);

        wordItem.appendChild(wordText);
        wordItem.appendChild(wordActions);
        wordList.appendChild(wordItem);
      });
      listGroup.appendChild(wordList);
      listsContainer.appendChild(listGroup);
    });
  };

  // --- Event Handlers ---
  const setupEventListeners = () => {
    const handleCreateList = () => {
      const listName = newListInput.value.trim();
      if (listName) {
        listsData.push({ name: listName, words: [] });
        newListInput.value = '';
        newListInputContainer.classList.add('hidden');
        render();
      }
    };

    addListBtn.addEventListener('click', () => {
      newListInputContainer.classList.toggle('hidden');
      if (!newListInputContainer.classList.contains('hidden')) {
        newListInput.focus();
      }
    });

    newListInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleCreateList();
      }
    });

    listsContainer.addEventListener('click', (event) => {
      const target = event.target;
      const wordItem = target.closest('.word-item');
      
      // If the click is not on a word item or its children, handle list expansion.
      if (!wordItem) {
          const listItem = target.closest('.list-group-item');
          if (listItem) {
              const index = parseInt(listItem.dataset.index, 10);
              activeListIndex = (activeListIndex === index) ? -1 : index;
              render();
          }
          return;
      }

      const listIndex = parseInt(wordItem.dataset.listIndex, 10);
      const wordIndex = parseInt(wordItem.dataset.wordIndex, 10);

      // --- Handle Word Edit ---
      if (target.closest('.edit-word-btn')) {
        wordItem.innerHTML = `
          <input type="text" class="word-edit-input" value="${listsData[listIndex].words[wordIndex]}" />
          <div class="word-actions">
            <button class="word-action-btn save-edit-btn"></button>
            <button class="word-action-btn cancel-edit-btn"></button>
          </div>
        `;
        wordItem.querySelector('.word-edit-input').focus();
        return; // Stop further processing
      }

      // --- Handle Word Delete Confirmation ---
      if (target.closest('.delete-word-btn')) {
          wordItem.innerHTML = `
            <span class="word-text-confirm">Delete?</span>
            <div class="word-actions">
                <button class="word-action-btn confirm-delete-btn button-text">Yes</button>
                <button class="word-action-btn cancel-delete-btn button-text">No</button>
            </div>
          `;
          return; // Stop further processing
      }
      
      // --- Handle Save Edit ---
      if (target.closest('.save-edit-btn')) {
        const newWord = wordItem.querySelector('.word-edit-input').value.trim();
        if (newWord) {
          listsData[listIndex].words[wordIndex] = newWord;
        }
        render();
        return; // Stop further processing
      }
      
      // --- Handle Confirm Delete ---
      if(target.closest('.confirm-delete-btn')) {
        listsData[listIndex].words.splice(wordIndex, 1);
        render();
        return; // Stop further processing
      }

      // --- Handle Cancel Edit/Delete ---
      if (target.closest('.cancel-edit-btn') || target.closest('.cancel-delete-btn')) {
        render();
        return; // Stop further processing
      }
      
      // --- Handle Clicking Word Text ---
      if (target.closest('.word-text')) {
        document.dispatchEvent(new CustomEvent('wordSelected', { detail: { text: target.textContent } }));
      }
    });
  };

  // --- Public API ---
  const init = () => {
    render();
    setupEventListeners();
  };

  const getLists = () => {
    return listsData.map(list => list.name);
  };
  
  const addWordToList = (word, listName) => {
      const list = listsData.find(l => l.name === listName);
      if (list && !list.words.includes(word)) {
          list.words.push(word);
          render();
          return true;
      }
      return false;
  };

  return {
    init,
    getLists,
    addWordToList
  };
})();