// scripts/options.js

// Define a default language for the options page, can be same as background's default
const OPTIONS_DEFAULT_LANGUAGE = "en";

document.addEventListener("DOMContentLoaded", () => {
  const targetLanguageSelect = document.getElementById("targetLanguageSelect");
  const saveButton = document.getElementById("saveButton");
  const statusMessageDiv = document.getElementById("statusMessage");

  // Function to save options to chrome.storage
  function saveOptions() {
    const selectedLanguage = targetLanguageSelect.value;
    chrome.storage.local.set(
      {
        userTargetLanguage: selectedLanguage,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving settings:", chrome.runtime.lastError);
          displayStatus("Error saving settings! Check console.", "error");
          return;
        }
        displayStatus("Settings saved successfully!", "success");
      },
    );
  }

  // Function to load options from chrome.storage
  function loadOptions() {
    // We get 'userTargetLanguage'. If it's not set, result.userTargetLanguage will be undefined.
    chrome.storage.local.get(["userTargetLanguage"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError);
        displayStatus("Error loading settings! Check console.", "error");
        // Set to a sensible default if loading fails or nothing is stored
        targetLanguageSelect.value = OPTIONS_DEFAULT_LANGUAGE;
        return;
      }
      // If userTargetLanguage is stored, use it. Otherwise, use our options page default.
      targetLanguageSelect.value =
        result.userTargetLanguage || OPTIONS_DEFAULT_LANGUAGE;
    });
  }

  // Function to display status messages
  function displayStatus(message, type = "success") {
    // type can be 'success' or 'error'
    statusMessageDiv.textContent = message;
    statusMessageDiv.className = type; // Use class for styling
    statusMessageDiv.style.display = "block";

    // Hide the message after a few seconds
    setTimeout(() => {
      statusMessageDiv.style.display = "none";
      statusMessageDiv.textContent = "";
      statusMessageDiv.className = "";
    }, 3000); // Display for 3 seconds
  }

  // Add event listener for the save button
  if (saveButton) {
    saveButton.addEventListener("click", saveOptions);
  } else {
    console.error("Save button not found.");
  }

  // Load saved options when the DOM is fully loaded
  if (targetLanguageSelect) {
    loadOptions();
  } else {
    console.error("Target language select dropdown not found.");
  }
});
