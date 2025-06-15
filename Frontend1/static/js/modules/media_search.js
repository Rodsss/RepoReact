//
// FILE: Frontend1/static/js/modules/media_search.js (Final Corrected Version)
//
let state = null;
const API_BASE_URL = '/api/v1';

let playerInterval = null;
let currentTranscript = [];
let playbackTime = 0;

export function initializeMediaSearchFeature(appState) {
    state = appState;
    document.getElementById('media-search-button').addEventListener('click', handleMediaSearch);
}

async function handleMediaSearch() {
    const searchInput = document.getElementById('media-search-input');
    const query = searchInput.value.trim();
    
    // Use the new, safe message container
    const statusMessage = document.getElementById('search-status-message');
    
    statusMessage.innerHTML = '<p class="p-3">Searching...</p>';
    stopPlayback();
    document.getElementById('fake-player-container').classList.add('hidden'); // Hide old results

    try {
        const response = await fetch(`${API_BASE_URL}/media-search?query=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        statusMessage.innerHTML = ''; // Clear "Searching..." message

        if (results && results.length > 0) {
            displayFakePlayer(results[0]);
        } else {
            statusMessage.innerHTML = '<p class="p-3">No results found.</p>';
        }
    } catch (error) {
        console.error('Failed to fetch media search results:', error);
        statusMessage.innerHTML = '<p class="p-3 text-danger">Sorry, an error occurred.</p>';
    }
}

function displayFakePlayer(videoData) {
    const playerContainer = document.getElementById('fake-player-container');
    if (!playerContainer) {
        console.error("Critical Error: The #fake-player-container HTML element could not be found.");
        return; 
    }
    
    playerContainer.classList.remove('hidden');
    currentTranscript = videoData.transcript || [];
    
    populateCaptions(currentTranscript);
    setupFakePlayerControls();
    updatePlayerStatusText('Stopped');
}

function populateCaptions(transcript) {
    const captionBox = document.getElementById('caption-box');
    captionBox.innerHTML = transcript.map(line => 
        `<p data-start="${line.start}">${line.text}</p>`
    ).join('');
}

function setupFakePlayerControls() {
    document.getElementById('play-btn').onclick = startPlayback;
    document.getElementById('stop-btn').onclick = stopPlayback;
    document.getElementById('replay-btn').onclick = replayPlayback;
}

function startPlayback() {
    if (playerInterval) return;

    updatePlayerStatusText('Playing...');
    
    playerInterval = setInterval(() => {
        playbackTime += 1;
        updatePlayerStatusText(`Playing... (${playbackTime}s)`);
        highlightCurrentCaption();

        const lastCaptionTime = currentTranscript.length > 0 ? currentTranscript[currentTranscript.length - 1].start : 0;
        if (playbackTime > lastCaptionTime + 3) {
            stopPlayback();
            updatePlayerStatusText('Finished');
        }
    }, 1000);
}

function stopPlayback() {
    clearInterval(playerInterval);
    playerInterval = null;
    if (playbackTime > 0) {
        updatePlayerStatusText(`Paused (${playbackTime}s)`);
    } else {
        updatePlayerStatusText('Stopped');
    }
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
        if (playbackTime >= startTime) {
            activeLine = line;
        }
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