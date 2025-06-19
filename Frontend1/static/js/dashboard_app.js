// This runs once the entire HTML page has been loaded and is ready.
document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard UI Initializing...");

    // --- Reusable function to display text and log it to history. ---
    function processCapturedText(text) {
        if (!text) return;
        const sourceTextBox = document.getElementById('source-text');
        const translatedTextBox = document.getElementById('translated-text');
        if (sourceTextBox) {
            sourceTextBox.textContent = text;
        }
        if (translatedTextBox) {
            translatedTextBox.textContent = '';
        }
        fetch("http://127.0.0.1:8000/history/log", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, source_url: "From Extension" })
        })
        .then(response => response.json())
        .then(data => console.log(`Logged "${text}" to history.`, data))
        .catch(error => console.error("Failed to log text to history:", error));
    }

    // --- Logic to check for text in the URL when the page loads. ---
    const urlParams = new URLSearchParams(window.location.search);
    const textFromUrl = urlParams.get('text');
    if (textFromUrl) {
        processCapturedText(decodeURIComponent(textFromUrl));
    }

    // --- 1. ORIGINAL LOGIC FOR MAIN SIDEBAR NAVIGATION ---
    const viewContainer = document.querySelector('.main-content');
    const navButtons = document.querySelectorAll('.menu-button[data-view]');
    function switchView(viewToShow) {
        if (viewContainer) {
            viewContainer.querySelectorAll('.view').forEach(view => {
                view.style.display = 'none';
            });
        }
        navButtons.forEach(button => {
            button.classList.remove('active');
        });
        const newView = document.getElementById(`${viewToShow}-view`);
        if (newView) {
            newView.style.display = (viewToShow === 'translate') ? 'grid' : 'block';
        }
        const newButton = document.querySelector(`.menu-button[data-view="${viewToShow}"]`);
        if (newButton) {
            newButton.classList.add('active');
        }
    }
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            switchView(button.dataset.view);
        });
    });

    // --- 2. ORIGINAL LOGIC FOR COLLAPSIBLE MENUS (in Pane 1) ---
    const paneOne = document.querySelector('.pane-one');
    if (paneOne) {
        paneOne.addEventListener('click', (event) => {
            const header = event.target.closest('.collapsible-header');
            if (header) {
                header.parentElement.classList.toggle('active');
            }
        });
    }

    // --- 3. MODIFIED: LIST MANAGEMENT (PANE 2) ---
    const paneTwo = document.querySelector('.pane-two');
    const collectionsContainer = document.getElementById('collections-container');
    const newListInput = document.getElementById('new-list-input');
    const userId = "default-user";

    async function fetchAndRenderLists() {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/users/${userId}/stacks`);
            if (!response.ok) throw new Error('Failed to fetch lists.');
            let lists = await response.json();

            // Sort lists alphabetically by name for a "nice" order
            lists.sort((a, b) => a.stack_name.localeCompare(b.stack_name));

            if (collectionsContainer) {
                collectionsContainer.innerHTML = lists.length > 0
                    ? lists.map(list => `<button class="list-item-button" data-stack-id="${list.stack_id}">${list.stack_name}</button>`).join('')
                    : '<p style="padding: 15px; color: #6a7183;">No lists found. Click the \'+\' icon to create one.</p>';
            }
        } catch (error) {
            console.error("Failed to render lists:", error);
            if (collectionsContainer) {
                collectionsContainer.innerHTML = '<p style="padding: 15px; color: #e94560;">Error loading lists.</p>';
            }
        }
    }

    async function createNewList(listName) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/stacks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stack_name: listName })
            });
            if (!response.ok) throw new Error('API call failed.');

            // Refresh the list display after successful creation
            await fetchAndRenderLists();

        } catch (error) {
            console.error("Failed to create new list:", error);
            alert("Error: Could not create the new list.");
        }
    }

    if (paneTwo) {
        paneTwo.addEventListener('click', (event) => {
            if (event.target.closest('.action-button[title="Create new list"]')) {
                const container = document.getElementById('new-list-container');
                container.classList.toggle('visible');
                if (container.classList.contains('visible')) {
                    newListInput.focus();
                }
            }
        });

        if (newListInput) {
            newListInput.addEventListener('keydown', async (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const newListName = newListInput.value.trim();
                    if (newListName) {
                        await createNewList(newListName);
                        newListInput.value = ''; // Clear input
                        document.getElementById('new-list-container').classList.remove('visible'); // Hide box
                    }
                }
            });
        }
    }
    
    // Initial load of lists
    fetchAndRenderLists();


    // --- 4. LISTENER FOR INCOMING TEXT FROM EXTENSION ---
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === "TEXT_COLLECTED") {
                processCapturedText(request.text);
            }
        });
    }

    // --- 5. MODAL LOGIC FOR "SAVE TO LIST" ---
    const saveToListBtn = document.getElementById('save-to-list-btn');
    const modalOverlay = document.getElementById('save-to-list-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalListsContainer = document.getElementById('modal-lists-container');

    async function openSaveToListModal() {
        const sourceTextBoxForModal = document.getElementById('source-text');
        if (!sourceTextBoxForModal.textContent.trim()) {
            alert("No text to save.");
            return;
        }
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/users/${userId}/stacks`);
            if (!response.ok) throw new Error('Failed to fetch lists.');
            let lists = await response.json();
            lists.sort((a, b) => a.stack_name.localeCompare(b.stack_name)); // Also sort here
            
            modalListsContainer.innerHTML = lists.length > 0
                ? lists.map(list => `<button class="modal-list-item" data-stack-id="${list.stack_id}">${list.stack_name}</button>`).join('')
                : `<p style="padding: 10px; text-align: center;">No lists found. Please create one first.</p>`;
            
            modalOverlay.classList.remove('hidden');
        } catch (error) {
            console.error("Failed to fetch lists for modal:", error);
            alert("Could not load your lists.");
        }
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
    }

    async function saveItemToStack(stackId, text) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/stacks/${stackId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            if (!response.ok) throw new Error('Failed to save item.');
            
            alert(`Saved "${text}" successfully!`);
            closeModal();
        } catch (error) {
            console.error("Failed to save item:", error);
            alert("Error: Could not save the item.");
        }
    }

    if (saveToListBtn) {
        saveToListBtn.addEventListener('click', openSaveToListModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) closeModal();
        });
    }
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modalListsContainer) {
        modalListsContainer.addEventListener('click', (event) => {
            const listButton = event.target.closest('.modal-list-item');
            if (listButton) {
                const stackId = listButton.dataset.stackId;
                const textToSave = document.getElementById('source-text').textContent.trim();
                saveItemToStack(stackId, textToSave);
            }
        });
    }
    if (saveToListButton) {
        saveToListButton.addEventListener('click', openSaveToListModal);
    }
   

    // --- Set the default view when the app loads ---
    switchView('translate');

});