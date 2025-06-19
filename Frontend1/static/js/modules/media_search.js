//
// FILE: Frontend1/static/js/modules/media_search.js (Final Consolidated Version)
//
import { fetchWithAuth } from '../services/apiService.js'; // <-- ADDED for centralized API calls

let state = null;
let renderApp = null; 

// --- Reusable Component Functions ---

function StatusMessageComponent(message) {
    return `<p class="p-3">${message}</p>`;
}

function FakePlayerComponent(videoData) {
    return `
        <div id="fake-player-container" class="p-3">
            <div id="fake-player-screen" class="mb-2">
                <span id="player-status-text">Stopped</span>
            </div>
            <div id="fake-player-controls" class="mb-3">
                <button class="btn-base btn-custom-outline" data-action="play">
                    <i class="bi bi-play-fill"></i><span>Play</span>
                </button>
                <button class="btn-base btn-custom-outline" data-action="stop">
                    <i class="bi bi-stop-fill"></i><span>Stop</span>
                </button>
                <button class="btn-base btn-custom-outline" data-action="replay">
                    <i class="bi bi-arrow-counterclockwise"></i><span>Replay</span>
                </button>
            </div>
            <div class="caption-wrapper">
                <label class="form-label">Captions</label>
                <div id="caption-box" class="p-3 border rounded" style="height: 100%; font-size: 16px;">
                    ${(videoData.transcript || []).map(line => `<p data-start="${line.start}">${line.text}</p>`).join('')}
                </div>
            </div>
        </div>
    `;
}


// --- Main Rendering Logic for this Module ---

export function renderMediaSearch() {
    const container = document.getElementById('media-search-results');
    if (!container) return;

    if (state.searchStatus === 'loading') {
        container.innerHTML = StatusMessageComponent('Searching...');
    } else if (state.searchStatus === 'success' && state.mediaSearchResults.length > 0) {
        container.innerHTML = FakePlayerComponent(state.mediaSearchResults[0]);
        attachPlayerEventListeners();
    } else {
        container.innerHTML = StatusMessageComponent('No results found.');
    }
}


// --- Event Handling and State Changes ---

export function initializeMediaSearchFeature(appState, mainRenderCallback) {
    state = appState;
    renderApp = mainRenderCallback; 
    state.searchStatus = 'idle'; 

    document.getElementById('media-search-button').addEventListener('click', handleMediaSearch);
}

async function handleMediaSearch() {
    const query = document.getElementById('media-search-input').value.trim();
    if (!query) return;

    state.searchStatus = 'loading';
    renderApp();
    
    stopPlayback();

    try {
        const results = await fetchWithAuth(`/media-search?query=${encodeURIComponent(query)}`);
        
        state.mediaSearchResults = results;
        state.searchStatus = 'success';
        renderApp();

    } catch (error) {
        console.error('Failed to fetch media search results:', error);
        state.searchStatus = 'error';
        renderApp();
    }
}

// --- Fake Player Logic ---

let playerInterval = null;
let playbackTime = 0;

function attachPlayerEventListeners() {
    document.querySelector('[data-action="play"]')?.addEventListener('click', startPlayback);
    document.querySelector('[data-action="stop"]')?.addEventListener('click', stopPlayback);
    document.querySelector('[data-action="replay"]')?.addEventListener('click', replayPlayback);
}

function startPlayback() {
    if (playerInterval) return;
    updatePlayerStatusText('Playing...');
    playerInterval = setInterval(() => {
        playbackTime += 1;
        updatePlayerStatusText(`Playing... (${playbackTime}s)`);
        highlightCurrentCaption();
    }, 1000);
}

function stopPlayback() {
    clearInterval(playerInterval);
    playerInterval = null;
    updatePlayerStatusText(playbackTime > 0 ? `Paused (${playbackTime}s)` : 'Stopped');
}

function replayPlayback() {
    stopPlayback();
    playbackTime = 0;
    highlightCurrentCaption();
    startPlayback();
}

function highlightCurrentCaption() {
    let activeLine = null;
    const captionLines = document.querySelectorAll('#caption-box p');
    captionLines.forEach(line => {
        const startTime = parseFloat(line.dataset.start);
        if (playbackTime >= startTime) activeLine = line;
        line.classList.remove('active-caption');
    });
    if (activeLine) {
        activeLine.classList.add('active-caption');
        activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function updatePlayerStatusText(text) {
    const statusText = document.getElementById('player-status-text');
    if(statusText) statusText.textContent = text;
}