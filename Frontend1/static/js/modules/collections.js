// This module will now handle all logic for fetching, rendering, and creating lists.

const userId = "default-user"; // Use a dynamic user ID in a real app
let collectionsContainer = null;
let newListInput = null;

// --- Initialization ---
// This function will be called by dashboard_app.js to set everything up.
export function initializeCollectionsModule() {
    collectionsContainer = document.getElementById('collections-container');
    newListInput = document.getElementById('new-list-input');
    const paneTwo = document.querySelector('.pane-two');

    if (paneTwo) {
        // Listen for clicks on the '+' button
        paneTwo.addEventListener('click', (event) => {
            if (event.target.closest('.action-button[title="Create new list"]')) {
                const container = document.getElementById('new-list-container');
                container.classList.toggle('visible');
                if (container.classList.contains('visible')) {
                    newListInput.focus();
                }
            }
        });
    }

    if (newListInput) {
        // Listen for 'Enter' key to create a new list
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

    // Fetch and display the lists when the module is first loaded
    fetchAndRenderLists();
}


// --- Data Fetching and Rendering ---

async function fetchAndRenderLists() {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/users/${userId}/stacks`);
        if (!response.ok) throw new Error('Failed to fetch lists.');
        let lists = await response.json();

        // Sort lists alphabetically by name
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