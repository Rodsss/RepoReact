// --- MAIN EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners for elements on the translate page
    document.getElementById('translate-button').addEventListener('click', handleOnPageTranslate);
    document.getElementById('save-to-list-button').addEventListener('click', handleSaveToListClick);

    // Initial setup for the translate page
    populateTextboxFromUrl();
    fetchAndPopulateStacksDropdown(); 
});


// --- TRANSLATE PAGE SPECIFIC FUNCTIONS ---

// Populates the "Select a list" dropdown on the translate page
async function fetchAndPopulateStacksDropdown() {
    const dropdown = document.getElementById('stack-select-dropdown');
    if (!dropdown) return;
    const userId = "default-user";
    const apiUrl = `/api/v1/users/${userId}/stacks`;

    try {
        const stacks = await (await fetch(apiUrl)).json();
        dropdown.innerHTML = '<option value="" disabled selected>Select a list</option>'; // Reset
        if (stacks.length > 0) {
            stacks.forEach(stack => {
                const option = document.createElement('option');
                option.value = stack.stack_id;
                option.textContent = stack.stack_name;
                dropdown.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching stacks for dropdown:", error);
        dropdown.innerHTML = '<option value="" disabled>Could not load lists</option>';
    }
}

// Handles the "Save to List" button click on the translate page
async function handleSaveToListClick() {
    const textInput = document.getElementById('translate-input');
    const textToSave = textInput.value.trim();
    const stackDropdown = document.getElementById('stack-select-dropdown');
    const selectedStackId = stackDropdown.value;

    if (!textToSave) {
        alert("The textbox is empty.");
        return;
    }
    if (!selectedStackId) {
        alert("Please select a list to save to.");
        return;
    }

    try {
        const response = await fetch(`/api/v1/stacks/${selectedStackId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: textToSave,
                sourceUrl: window.location.href, // Or any other relevant source
                pageTitle: document.title 
            })
        });

        if (response.ok) {
            alert("Item saved successfully!");
            textInput.value = '';
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to save item.");
        }
    } catch (error) {
        console.error("Failed to save item to list:", error);
        alert(`Error: ${error.message}`);
    }
}

// Handles the core translation button click
async function handleOnPageTranslate() {
    const inputElement = document.getElementById('translate-input');
    const outputElement = document.getElementById('translate-output');
    const textToTranslate = inputElement.value.trim();
    if (!textToTranslate) return;
    outputElement.value = "Translating...";
    try {
        const response = await fetch('/api/v1/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToTranslate })
        });
        if (!response.ok) throw new Error("Translation request failed.");
        const result = await response.json();
        outputElement.value = result.translated_text;
    } catch (error) {
        console.error("On-page translation error:", error);
        outputElement.value = "Error: Could not get translation.";
    }
}

// Populates the translation text area if text is provided in the URL
function populateTextboxFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const textFromExtension = urlParams.get('text');
    const mainTextbox = document.getElementById('translate-input');
    if (textFromExtension && mainTextbox) mainTextbox.value = textFromExtension;
}