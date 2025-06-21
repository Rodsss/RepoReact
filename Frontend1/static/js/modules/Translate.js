const TranslateModule = (() => {
  // --- DOM Elements ---
  const sourceTextArea = document.getElementById('source-text-area');
  const starBtn = document.getElementById('star-btn');
  const modal = document.getElementById('save-to-list-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalListsContainer = document.getElementById('modal-lists-container');

  // --- Functions ---
  const closeModal = () => modal.classList.add('hidden');

  const openModal = () => {
    const textToSave = sourceTextArea.value.trim();
    if (!textToSave) {
      alert('Text box is empty. Please enter text to save.');
      return;
    }
    // Asks the dashboard manager to provide the lists for the modal
    document.dispatchEvent(new CustomEvent('requestListsForModal', { detail: { text: textToSave } }));
  };
  
  const renderModalLists = (lists, textToSave) => {
    modalListsContainer.innerHTML = '';
    lists.forEach((listName) => {
        const label = document.createElement('label');
        label.className = 'modal-list-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.listName = listName;
        
        label.appendChild(checkbox);
        label.append(` ${listName}`);
        modalListsContainer.appendChild(label);
    });
    modal.classList.remove('hidden');
  };

  const setupEventListeners = () => {
    // Event listeners for the "Save to list" modal
    starBtn.addEventListener('click', openModal);
    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    modalListsContainer.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox' && event.target.checked) {
            const listName = event.target.dataset.listName;
            const textToSave = sourceTextArea.value.trim();
            // Dispatches an event to the dashboard to save the word
            document.dispatchEvent(new CustomEvent('saveWordToList', { detail: { text: textToSave, list: listName } }));
            alert(`Saved "${textToSave}" to the "${listName}" list.`);
            closeModal();
        }
    });

    // --- Event listener for the new collapsible menus ---
    const menuContainer = document.querySelector('.collapsible-menu-container');
    if (menuContainer) {
      menuContainer.addEventListener('click', (event) => {
        const trigger = event.target.closest('.collapsible-trigger');
        if (!trigger) return;

        // Toggle the 'active' class on the button for styling
        trigger.classList.toggle('active');

        // Find the content panel immediately following the button
        const content = trigger.nextElementSibling;
        
        // Check if the content panel is already open
        if (content.style.maxHeight) {
          // If it's open, close it by setting max-height to null
          content.style.maxHeight = null;
        } else {
          // If it's closed, open it by setting max-height to its scroll height
          content.style.maxHeight = content.scrollHeight + "px";
        }
      });
    }
  };
  
  // --- Public API ---
  const init = () => {
    setupEventListeners();
    // Handle text passed from a browser extension, if any
    const urlParams = new URLSearchParams(window.location.search);
    const textFromExtension = urlParams.get('text');
    if (textFromExtension) {
      sourceTextArea.value = decodeURIComponent(textFromExtension);
    }
  };

  const setText = (text) => {
    sourceTextArea.value = text;
  };

  return {
    init,
    setText,
    renderModalLists
  };
})();