document.addEventListener('DOMContentLoaded', () => {
    
const urlParams = new URLSearchParams(window.location.search);
    const textFromExtension = urlParams.get('text');
    const mainTextbox = document.getElementById('translate-input');

    console.log("Translate page loaded. Checking for URL parameters."); // Debug log 1
    
    if (textFromExtension && mainTextbox) {
        console.log("SUCCESS: Found text '", textFromExtension, "' and found the textbox element."); // Debug log 2
        mainTextbox.value = textFromExtension;
    } else {
        console.error("FAILURE: Did not populate textbox. Let's find out why:"); // Debug log 3
        if (!textFromExtension) {
            console.error("- Reason: The 'text' parameter was not found in the URL.");
        }
        if (!mainTextbox) {
            console.error("- Reason: An element with the id 'translate-input' was not found on the page.");
        }
    }
    // --- END OF CRITICAL CODE ---

    // This is the existing function to load the lists pane, it runs after the code above.
    fetchAndDisplaySnippets();
});

async function fetchAndDisplaySnippets() {
    // We use the same default user ID for now
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/collected_items`;
    const listContainer = document.getElementById('snippet-list-container');

    if (!listContainer) {
        console.error("Could not find the '#snippet-list-container' element.");
        return;
    }

    listContainer.innerHTML = '<p>Loading lists...</p>'; // Show a loading message

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        const snippets = await response.json();

        if (snippets.length === 0) {
            listContainer.innerHTML = '<p>No snippets collected yet. Use the extension to save some!</p>';
            return;
        }

        // Create a list to hold the items
        const ul = document.createElement('ul');
        ul.className = 'collection-list'; // Add a class for styling

        snippets.forEach(snippet => {
            const li = document.createElement('li');
            li.className = 'collection-item';
            
            const sourceText = `<strong>Snippet:</strong> ${snippet.source_text}`;
            const sourceUrl = `<a href="${snippet.source_url}" target="_blank">${snippet.source_url || 'No source URL'}</a>`;
            const timestamp = new Date(snippet.timestamp_collected).toLocaleString();

            li.innerHTML = `
                <p>${sourceText}</p>
                <small><strong>Source:</strong> ${sourceUrl}</small><br/>
                <small><strong>Collected:</strong> ${timestamp}</small>
            `;
            ul.appendChild(li);
        });

        // Clear the container and append the new list
        listContainer.innerHTML = '';
        listContainer.appendChild(ul);

    } catch (error) {
        console.error("Failed to fetch snippets:", error);
        listContainer.innerHTML = '<p class="error-message">There was an error loading your snippets.</p>';
    }
}