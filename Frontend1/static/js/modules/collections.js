// This module is now refactored to be state-driven.

import { fetchWithAuth } from "../services/apiService.js";

let state = null;
let renderApp = null;

// --- State Initializer ---
// Ensures the collections slice of state exists.
function initializeState() {
  if (!state.collections) {
    state.collections = {
      lists: [],
      isLoading: true,
      error: null,
      isCreatorVisible: false,
    };
  }
}

// --- Main Component Renderer ---
// This function reads from the state and returns the HTML. It doesn't fetch data.
export function CollectionsComponent() {
  if (state.collections.isLoading) {
    return "<p>Loading lists...</p>";
  }
  if (state.collections.error) {
    return `<p style="padding: 15px; color: #e94560;">${state.collections.error}</p>`;
  }

  const listsHtml =
    state.collections.lists.length > 0
      ? state.collections.lists
          .map(
            (list) =>
              `<button class="list-item-button" data-action="select-list" data-stack-id="${list.stack_id}">${list.stack_name}</button>`,
          )
          .join("")
      : "<p style=\"padding: 15px; color: #6a7183;\">No lists found. Click the '+' icon to create one.</p>";

  const creatorVisibilityClass = state.collections.isCreatorVisible
    ? "visible"
    : "";
  const creatorHtml = `
        <div id="new-list-container" class="${creatorVisibilityClass}">
             <input type="text" id="new-list-input" placeholder="New list name..." />
        </div>
    `;

  return listsHtml + creatorHtml;
}

// --- Event Handling and State Changes ---
// This is the main entry point called by your dashboard_app.js
export function initializeCollectionsFeature(appState, mainRenderCallback) {
  state = appState;
  renderApp = mainRenderCallback;
  initializeState();

  // The main container will now handle all clicks for this view
  const collectionsContainer = document.getElementById(
    "collections-view-container",
  );
  if (collectionsContainer) {
    collectionsContainer.addEventListener("click", handleDelegatedEvents);
    collectionsContainer.addEventListener("keydown", handleDelegatedEvents);
  }

  // Initial fetch of data
  fetchLists();
}

// --- Delegated Event Handler ---
async function handleDelegatedEvents(event) {
  // Handle creating a new list on "Enter"
  if (
    event.type === "keydown" &&
    event.key === "Enter" &&
    event.target.id === "new-list-input"
  ) {
    event.preventDefault();
    const newListName = event.target.value.trim();
    if (newListName) {
      await createNewList(newListName);
    }
    return;
  }

  if (event.type !== "click") return;

  // Handle clicks on buttons using data-action attributes
  const target = event.target;
  const action =
    target.dataset.action || target.closest("[data-action]")?.dataset.action;

  switch (action) {
    case "toggle-list-creator":
      state.collections.isCreatorVisible = !state.collections.isCreatorVisible;
      renderApp();
      if (state.collections.isCreatorVisible) {
        // Use a timeout to ensure the element is in the DOM before focusing
        setTimeout(() => document.getElementById("new-list-input")?.focus(), 0);
      }
      break;
    case "select-list":
      // Placeholder for what happens when a list is selected
      console.log("Selected list with ID:", target.dataset.stackId);
      break;
  }
}

// --- Data Fetching Functions (Actions) ---
// These functions fetch data, update the state, and trigger a re-render.

async function fetchLists() {
  state.collections.isLoading = true;
  renderApp(); // Show loading state

  try {
    const lists = await fetchWithAuth("/users/default-user/stacks");
    lists.sort((a, b) => a.stack_name.localeCompare(b.stack_name));
    state.collections.lists = lists;
    state.collections.error = null;
  } catch (error) {
    console.error("Failed to render lists:", error);
    state.collections.error = "Error loading lists.";
  }

  state.collections.isLoading = false;
  renderApp(); // Render the final state (data or error)
}

async function createNewList(listName) {
  try {
    await fetchWithAuth("/stacks", {
      method: "POST",
      body: JSON.stringify({ stack_name: listName }),
    });
    state.collections.isCreatorVisible = false; // Hide the input box
    await fetchLists(); // Refetch all lists to get the new one
  } catch (error) {
    console.error("Failed to create new list:", error);
    alert("Error: Could not create the new list.");
    renderApp(); // Re-render to show potential error messages if any were set
  }
}
