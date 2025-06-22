/**
 * =============================================================================
 * media_search.js
 * * Module for the "Watch" tab in Pane 3.
 * Handles searching for media and displaying it in a fake player with captions.
 *
 * NOTE: The API call in this file is currently MOCKED for frontend development.
 * =============================================================================
 */

import { fetchWithAuth } from "../services/apiService.js";

let state = null;
let renderApp = null;

// --- Reusable Component Functions ---

function StatusMessageComponent(message) {
  return `<p class="media-status-message">${message}</p>`;
}

function FakePlayerComponent(videoData) {
  return `
        <div id="fake-player-container">
            <div id="fake-player-screen" class="mb-2">
                <span id="player-status-text">Stopped</span>
            </div>
            <div id="fake-player-controls" class="mb-3">
                <button class="action-btn" data-action="play" title="Play">
                    <i class="bi bi-play-fill"></i>
                </button>
                <button class="action-btn" data-action="stop" title="Stop">
                    <i class="bi bi-stop-fill"></i>
                </button>
                <button class="action-btn" data-action="replay" title="Replay">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
            </div>
            <div class="caption-wrapper">
                <label class="form-label">Captions</label>
                <div id="caption-box">
                    ${(videoData.transcript || []).map((line) => `<p data-start="${line.start}">${line.text}</p>`).join("")}
                </div>
            </div>
        </div>
    `;
}

// --- Main Rendering Logic for this Module ---

export function renderMediaSearch() {
    if (!state) return;

  const container = document.getElementById("media-search-results");
  if (!container) return;

  const currentStatus = state.mediaSearch.searchStatus;
  const searchResults = state.mediaSearch.mediaSearchResults;

  if (currentStatus === "loading") {
    container.innerHTML = StatusMessageComponent("Searching for media...");
  } else if (currentStatus === "success" && searchResults.length > 0) {
    container.innerHTML = FakePlayerComponent(searchResults[0]);
    attachPlayerEventListeners();
  } else if (currentStatus === "error") {
      container.innerHTML = StatusMessageComponent("An error occurred. Please try again.");
  } else if (currentStatus === "success" && searchResults.length === 0) {
    container.innerHTML = StatusMessageComponent("No results found for your query.");
  } else {
    container.innerHTML = StatusMessageComponent("Enter a search term to find a video.");
  }
}

// --- Event Handling and State Changes ---

export function initializeMediaSearchFeature(appState, mainRenderCallback) {
  state = appState;
  renderApp = mainRenderCallback;
  
  const searchButton = document.getElementById("media-search-button");
  const searchInput = document.getElementById("media-search-input");

  if (searchButton) {
      searchButton.addEventListener("click", handleMediaSearch);
  }
  if(searchInput){
      searchInput.addEventListener("keydown", (event) => {
          if (event.key === 'Enter') {
              handleMediaSearch();
          }
      });
  }
}

// --- MOCKED API Handler ---
// This function simulates a successful API call for frontend development.
async function handleMediaSearch() {
  const query = document.getElementById("media-search-input").value.trim();
  if (!query) return;

  console.log("MOCK: Searching for media with query:", query);
  state.mediaSearch.searchStatus = "loading";
  renderApp();
  stopPlayback();

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Provide fake data as if the API returned it
  const mockResults = [{
      video_id: "mock123",
      title: "A Mocked Video Result",
      transcript: [
          { start: 0, text: "This is the first line of the transcript." },
          { start: 3, text: "The fake player will highlight this line after 3 seconds." },
          { start: 6, text: "And this is the third and final line." },
          { start: 9, text: "The video ends here." }
      ]
  }];
  
  state.mediaSearch.mediaSearchResults = mockResults;
  state.mediaSearch.searchStatus = "success";
  console.log("MOCK: Search successful, rendering results.");
  renderApp();
}

/* --- ORIGINAL LIVE API FUNCTION (COMMENTED OUT) ---
async function handleMediaSearch() {
  const query = document.getElementById("media-search-input").value.trim();
  if (!query) return;

  state.mediaSearch.searchStatus = "loading";
  renderApp();

  stopPlayback();

  try {
    const results = await fetchWithAuth(
      `/media-search?query=${encodeURIComponent(query)}`,
    );

    state.mediaSearch.mediaSearchResults = results;
    state.mediaSearch.searchStatus = "success";
    renderApp();
  } catch (error) {
    console.error("Failed to fetch media search results:", error);
    state.mediaSearch.searchStatus = "error";
    renderApp();
  }
}
*/

// --- Fake Player Logic ---

let playerInterval = null;
let playbackTime = 0;

function attachPlayerEventListeners() {
  document.querySelector('[data-action="play"]')?.addEventListener("click", startPlayback);
  document.querySelector('[data-action="stop"]')?.addEventListener("click", stopPlayback);
  document.querySelector('[data-action="replay"]')?.addEventListener("click", replayPlayback);
}

function startPlayback() {
  if (playerInterval) return;
  updatePlayerStatusText("Playing...");
  playerInterval = setInterval(() => {
    playbackTime += 1;
    updatePlayerStatusText(`Playing... (${playbackTime}s)`);
    highlightCurrentCaption();
  }, 1000);
}

function stopPlayback() {
  clearInterval(playerInterval);
  playerInterval = null;
  updatePlayerStatusText(
    playbackTime > 0 ? `Paused (${playbackTime}s)` : "Stopped",
  );
}

function replayPlayback() {
  stopPlayback();
  playbackTime = 0;
  highlightCurrentCaption();
  startPlayback();
}

function highlightCurrentCaption() {
  let activeLine = null;
  const captionLines = document.querySelectorAll("#caption-box p");
  if (captionLines.length === 0) {
      stopPlayback();
      return;
  }
  
  captionLines.forEach((line) => {
    const startTime = parseFloat(line.dataset.start);
    if (playbackTime >= startTime) {
        activeLine = line;
    }
    line.classList.remove("active-caption");
  });

  if (activeLine) {
    activeLine.classList.add("active-caption");
    activeLine.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }
}

function updatePlayerStatusText(text) {
  const statusText = document.getElementById("player-status-text");
  if (statusText) {
    statusText.textContent = text;
  }
}