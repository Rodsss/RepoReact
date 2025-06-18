//
// FILE: Frontend1/static/js/modules/translate.js
//

const API_BASE_URL = '/api/v1';

// This function sets up the event listeners for the translate pane.
export function initializeTranslateFeature(appState, render) {
    const translateButton = document.getElementById('translate-execute-button');
    if (translateButton) {
        translateButton.addEventListener('click', () => handleTranslate(appState, render));
    }

    const saveToListButton = document.getElementById('save-to-list-button-translate');
    if (saveToListButton) {
        saveToListButton.addEventListener('click', () => handleSaveToList(appState, render));
    }
}

// This function updates the UI of the translate pane based on the central appState.
export function renderTranslate(appState) {
    const input = document.getElementById('translate-input');
    const output = document.getElementById('translate-output');
    const dropdown = document.getElementById('stack-select-dropdown-translate');

    if (input && appState.currentText) {
        input.value = appState.currentText;
    }
    
    if (output && appState.translationResult) {
        output.value = appState.translationResult;
    }

    // Populate the dropdown with stacks from the collections state
    if (dropdown && appState.collections && appState.collections.stacks) {
        const currentSelection = dropdown.value;
        dropdown.innerHTML = '<option value="" disabled>Select a list</option>';
        appState.collections.stacks.forEach(s => {
            dropdown.innerHTML += `<option value="${s.stack_id}">${s.stack_name}</option>`;
        });
        dropdown.value = currentSelection;
    }
}


// --- Event Handler Logic ---

async function handleTranslate(appState, render) {
    const input = document.getElementById('translate-input');
    if (!input || !input.value.trim()) return;

    // Update state to show we are translating
    appState.translationResult = "Translating...";
    render(); // Re-render the UI to show the "Translating..." message

    try {
        const response = await fetch(`${API_BASE_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input.value.trim() })
        });
        if (!response.ok) throw new Error("Translation failed");
        
        const result = await response.json();
        // Update state with the final result
        appState.translationResult = result.translated_text;
    } catch (error) {
        console.error("Translation error:", error);
        appState.translationResult = "Error during translation.";
    }
    
    // Call the main render function again to display the result
    render();
}

async function handleSaveToList(appState, render) {
    const textInput = document.getElementById('translate-input');
    const selectedStackId = document.getElementById('stack-select-dropdown-translate').value;

    if (!textInput.value.trim()) return alert("Textbox is empty.");
    if (!selectedStackId) return alert("Please select a list.");

    try {
        const response = await fetch(`${API_BASE_URL}/stacks/${selectedStackId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textInput.value.trim(), sourceUrl: window.location.href, pageTitle: document.title })
        });
        if (!response.ok) throw new Error((await response.json()).detail);
        
        // ** THIS IS THE NEW LOGIC **
        const newItem = await response.json(); // Get the newly created item from the API response

        // 1. Update the collections state with the new item.
        if (appState.collections && appState.collections.items) {
            appState.collections.items.push(newItem);
        }

        // 2. Clear the input text from the state.
        appState.currentText = '';
        appState.translationResult = '';

        // 3. (Optional) Switch the active view to the collections pane.
        //    This requires a function like switchRightPaneView from dashboard_app.js
        //    For now, we will just log it.
        console.log("Switching view to collections would happen here.");


        // 4. Trigger a full re-render of the application.
        render(); 

        alert("Item saved successfully!");

    } catch (error) {
        console.error("Failed to save item:", error);
        alert(`Error: ${error.message}`);
    }
}