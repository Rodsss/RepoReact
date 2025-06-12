// static/js/flashcard_app.js

document.addEventListener('DOMContentLoaded', function() {
    
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (!dashboardContainer) { return; } 

    // --- Configuration ---
    const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
    const USER_ID_PLACEHOLDER = 'temp_user_id_mvp_snippet'; 

    // --- Element Selectors ---
    const elements = {
        importStackNameInput: document.getElementById('import-stack-name'),
        importDataTextarea: document.getElementById('import-data-textarea'),
        importDelimiterSelect: document.getElementById('import-delimiter-select'),
        submitImportBtn: document.getElementById('submit-import-btn'),
        stacksListUl: document.getElementById('stacks-list-integrated'),
        loadingStacksMsg: document.getElementById('loading-stacks-message-integrated'),
        createStackBtn: document.getElementById('create-stack-btn-integrated'),
        newStackNameInput: document.getElementById('new-stack-name-integrated'),
        reviewAreaDiv: document.getElementById('flashcard-review-area-integrated'),
        currentStackNameSpan: document.querySelector('#current-stack-name-header-integrated span'),
        flashcardDisplayDiv: document.getElementById('flashcard-display-integrated'),
        reviewControlsDiv: document.getElementById('review-controls-integrated'),
        addFlashcardForm: document.getElementById('add-flashcard-form-area-integrated'),
        addToStackNameSpan: document.getElementById('add-to-stack-name'),
        newFlashcardFrontInput: document.getElementById('new-flashcard-front-integrated'),
        newFlashcardBackInput: document.getElementById('new-flashcard-back-integrated'),
        saveNewFlashcardBtn: document.getElementById('save-new-flashcard-btn-integrated'),
        videoResultsList: document.getElementById('video-results-list'),
        videoPlayerContainer: document.getElementById('video-player-container'),
    };

    // --- State Management ---
    let currentFlashcards = []; let currentCardIndex = 0;
    let currentStackIdForReview = null; let currentStackNameForReview = "";
    let isEditingFlashcard = false; let ytPlayer;

    // --- YouTube IFrame API Setup ---
    window.onYouTubeIframeAPIReady = function() { console.log("YouTube IFrame API is ready."); };

    // --- Utility ---
    const escapeHtml = (unsafe) => unsafe === null || typeof unsafe === 'undefined' ? '' : unsafe.toString().replace(/[&<>"']/g, match => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#039;'})[match]);
    
    // --- View Management ---
    function showReviewView(stackId, stackName) {
        currentStackIdForReview = stackId; currentStackNameForReview = stackName;
        if (elements.currentStackNameSpan) elements.currentStackNameSpan.textContent = escapeHtml(stackName);
        if (elements.addToStackNameSpan) elements.addToStackNameSpan.textContent = escapeHtml(stackName);
        if (elements.addFlashcardForm) elements.addFlashcardForm.style.display = 'block';
        fetchFlashcardsForStack(stackId);
    }
    
    // --- Stack Functions ---
    async function fetchAndDisplayStacks() {
        if (!elements.stacksListUl) return;
        try {
            elements.loadingStacksMsg.style.display = 'block'; 
            elements.stacksListUl.innerHTML = ''; 
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/stacks`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const stacks = await response.json();
            elements.loadingStacksMsg.style.display = 'none'; 
            if (stacks.length === 0) {
                elements.stacksListUl.innerHTML = '<li>No stacks found. Create one!</li>';
                return;
            }
            stacks.forEach(stack => {
                const li = document.createElement('li');
                const stackNameSpan = document.createElement('span');
                stackNameSpan.className = 'stack-name';
                stackNameSpan.textContent = escapeHtml(stack.stack_name) + (stack.is_default_stack ? ' (Default)' : '');
                li.appendChild(stackNameSpan);
                stackNameSpan.addEventListener('click', () => showReviewView(stack.stack_id, stack.stack_name));
                if (!stack.is_default_stack) {
                    const deleteStackButton = document.createElement('button');
                    deleteStackButton.textContent = 'Delete';
                    deleteStackButton.classList.add('delete-btn');
                    deleteStackButton.onclick = (event) => { event.stopPropagation(); handleDeleteStackClick(stack.stack_id, stack.stack_name); };
                    li.appendChild(deleteStackButton);
                }
                elements.stacksListUl.appendChild(li);
            });
        } catch (error) { console.error('Error fetching stacks:', error); }
    }
    
    async function createNewStack() {
        const stackName = elements.newStackNameInput.value.trim();
        if (!stackName) { alert('Please enter a stack name.'); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/stacks`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ stack_name: stackName }),
            });
            const result = await response.json(); 
            if (!response.ok) throw new Error(result.detail || `HTTP error!`);
            alert(`Stack "${escapeHtml(result.stack.stack_name)}" created!`);
            elements.newStackNameInput.value = ''; 
            fetchAndDisplayStacks(); 
        } catch (error) { console.error('Error creating stack:', error); alert(`Failed to create stack.`); }
    }

    async function handleDeleteStackClick(stackId, stackName) {
        if (!confirm(`Delete stack "${escapeHtml(stackName)}"?`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/stacks/${stackId}`, { method: 'DELETE'});
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || `HTTP error!`);
            alert(result.message);
            fetchAndDisplayStacks(); 
            if (currentStackIdForReview == stackId) {
                elements.flashcardDisplayDiv.innerHTML = '<p><em>Select a stack from the left.</em></p>';
                elements.reviewControlsDiv.innerHTML = '';
                elements.addFlashcardForm.style.display = 'none';
                elements.currentStackNameSpan.textContent = 'Select a stack';
            }
        } catch (error) { console.error('Error deleting stack:', error); alert(`Failed to delete stack.`); }
    }
    
    // --- Flashcard Functions ---
    async function fetchFlashcardsForStack(stackId) {
        if (!elements.flashcardDisplayDiv) return;
        try {
            elements.flashcardDisplayDiv.innerHTML = '<p>Loading cards...</p>';
            elements.reviewControlsDiv.innerHTML = ''; 
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/stacks/${stackId}/flashcards`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            currentFlashcards = await response.json();
            currentCardIndex = 0; isEditingFlashcard = false; 
            if (currentFlashcards.length > 0) { displayCurrentFlashcard(); } 
            else { elements.flashcardDisplayDiv.innerHTML = '<p>This stack is empty. Add a card above!</p>'; }
        } catch (error) { console.error('Error fetching flashcards:', error); }
    }

    function displayCurrentFlashcard() {
        elements.reviewControlsDiv.innerHTML = ''; 
        if (currentFlashcards.length === 0) {
            elements.flashcardDisplayDiv.innerHTML = "<p>This stack is now empty.</p>";
            return;
        }
        const card = currentFlashcards[currentCardIndex];
        elements.flashcardDisplayDiv.innerHTML = `
            <div class="flashcard" data-flashcard-id="${card.flashcard_id}">
                <div class="front" contentEditable="${isEditingFlashcard}">${escapeHtml(card.front_text)}</div>
                <div class="back" style="display:none;" contentEditable="${isEditingFlashcard}">${escapeHtml(card.back_text || '(No back text)')}</div>
                <div class="flashcard-actions"></div>
            </div>`;
        
        const actionsContainer = elements.flashcardDisplayDiv.querySelector('.flashcard-actions');
        if (isEditingFlashcard) {
            actionsContainer.innerHTML = `<button class="save-edit-btn">Save</button><button class="cancel-edit-btn">Cancel</button>`;
            actionsContainer.querySelector('.save-edit-btn').addEventListener('click', handleSaveFlashcardEditClick);
            actionsContainer.querySelector('.cancel-edit-btn').addEventListener('click', handleCancelFlashcardEditClick);
            elements.flashcardDisplayDiv.querySelector('.front').classList.add('editable-text');
            elements.flashcardDisplayDiv.querySelector('.back').classList.add('editable-text');
            elements.flashcardDisplayDiv.querySelector('.back').style.display = 'block'; 
        } else {
            actionsContainer.innerHTML = `<button class="watch-listen-btn">📺 Watch & Listen</button><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button>`;
            actionsContainer.querySelector('.watch-listen-btn').addEventListener('click', handleWatchAndListenClick);
            actionsContainer.querySelector('.edit-btn').addEventListener('click', handleEditFlashcardClick);
            actionsContainer.querySelector('.delete-btn').addEventListener('click', handleDeleteFlashcardClick);
            const showAnswerBtn = document.createElement('button');
            showAnswerBtn.textContent = 'Show Answer';
            showAnswerBtn.onclick = handleShowAnswerClick;
            elements.reviewControlsDiv.appendChild(showAnswerBtn);
        }
    }

    function handleShowAnswerClick() {
        const backDiv = elements.flashcardDisplayDiv.querySelector('.flashcard .back');
        if (backDiv) { backDiv.style.display = 'block'; }
        elements.reviewControlsDiv.innerHTML = `
            <button id="review-incorrect-btn" class="delete-btn">I Forgot</button>
            <button id="review-correct-btn" class="save-edit-btn">I Knew It</button>
        `;
        document.getElementById('review-incorrect-btn').addEventListener('click', () => handleReviewOutcome('incorrect'));
        document.getElementById('review-correct-btn').addEventListener('click', () => handleReviewOutcome('correct'));
    }

    async function handleReviewOutcome(outcome) {
        const flashcardId = currentFlashcards[currentCardIndex].flashcard_id;
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/flashcards/${flashcardId}/review`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ outcome: outcome }),
            });
            if (!response.ok) throw new Error(`HTTP error!`);
            moveToNextCard();
        } catch (error) { console.error('Error submitting review:', error); moveToNextCard(); }
    }

    function moveToNextCard() {
        currentCardIndex++;
        if (currentCardIndex >= currentFlashcards.length) {
            alert("Review session complete! Refetching stack with new order.");
            fetchFlashcardsForStack(currentStackIdForReview);
        } else { displayCurrentFlashcard(); }
    }
            
    function handleEditFlashcardClick() { isEditingFlashcard = true; displayCurrentFlashcard(); }
    function handleCancelFlashcardEditClick() { isEditingFlashcard = false; displayCurrentFlashcard(); }
    
    async function handleSaveFlashcardEditClick(event) {
        const cardElement = event.target.closest('.flashcard');
        const flashcardId = cardElement.dataset.flashcardId;
        const frontText = cardElement.querySelector('.front').textContent.trim();
        const backText = cardElement.querySelector('.back').textContent.trim();
        if (!frontText) { alert('Front text cannot be empty.'); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/flashcards/${flashcardId}`, {
                method: 'PUT', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ front_text: frontText, back_text: backText || null })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to update');
            alert('Flashcard updated!');
            isEditingFlashcard = false;
            const index = currentFlashcards.findIndex(fc => fc.flashcard_id == flashcardId);
            if (index !== -1) currentFlashcards[index] = result.flashcard;
            displayCurrentFlashcard(); 
        } catch (error) { console.error('Error updating flashcard:', error); alert(`Failed to update flashcard.`); }
    }

    async function handleDeleteFlashcardClick(event) {
        const flashcardId = event.target.closest('.flashcard').dataset.flashcardId;
        if (!confirm(`Are you sure you want to delete this flashcard?`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/flashcards/${flashcardId}`, { method: 'DELETE'});
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to delete');
            alert(result.message || `Flashcard deleted!`);
            currentFlashcards = currentFlashcards.filter(fc => fc.flashcard_id != flashcardId);
            if (currentCardIndex >= currentFlashcards.length) currentCardIndex = 0;
            displayCurrentFlashcard();
        } catch (error) { console.error('Error deleting flashcard:', error); alert(`Failed to delete flashcard.`); }
    }

    async function saveNewManualFlashcard() {
        const frontText = elements.newFlashcardFrontInput.value.trim();
        const backText = elements.newFlashcardBackInput.value.trim();
        if (!frontText) { alert('Front text is required.'); return; }
        if (currentStackIdForReview === null) { alert('No stack selected.'); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/stacks/${currentStackIdForReview}/flashcards`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ front_text: frontText, back_text: backText || null })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to create');
            alert(`Flashcard created in "${escapeHtml(currentStackNameForReview)}"!`);
            elements.newFlashcardFrontInput.value = ''; elements.newFlashcardBackInput.value = '';
            fetchFlashcardsForStack(currentStackIdForReview); 
        } catch (error) { console.error('Error saving new flashcard:', error); alert(`Failed to save flashcard.`); }
    }
    
    async function handleStackImport() {
        if (!elements.importStackNameInput) return;
        const stackName = elements.importStackNameInput.value.trim();
        const data = elements.importDataTextarea.value.trim();
        const delimiter = elements.importDelimiterSelect.value;
        if (!stackName || !data) { alert("Please provide a stack name and data to import."); return; }
        try {
            const payload = { user_id: USER_ID_PLACEHOLDER, stack_name: stackName, delimiter: delimiter, data: data };
            const response = await fetch(`${API_BASE_URL}/stacks/import`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to import');
            alert(result.message);
            elements.importStackNameInput.value = '';
            elements.importDataTextarea.value = '';
            fetchAndDisplayStacks();
        } catch (error) { console.error('Error importing stack:', error); alert(`Failed to import stack.`); }
    }
    
    async function handleWatchAndListenClick() {
        if (currentFlashcards.length === 0) return;
        const card = currentFlashcards[currentCardIndex];
        const term = card.front_text;
        if (!term) { alert("No term to search."); return; }

        elements.videoResultsList.innerHTML = `<p>Searching for clips of "${escapeHtml(term)}"...</p>`;
        if (elements.videoPlayerContainer) elements.videoPlayerContainer.style.display = 'none';
        if (ytPlayer) { try { ytPlayer.destroy(); } catch (e) { console.warn("Could not destroy YT player", e); } }

        try {
            const url = `${API_BASE_URL}/media/youtube-clips?term=${encodeURIComponent(term)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const clips = await response.json();
            if (clips.length === 0) {
                elements.videoResultsList.innerHTML = `<p>No video clips found for "${escapeHtml(term)}".</p>`;
                return;
            }
            elements.videoResultsList.innerHTML = ''; 
            const ul = document.createElement('ul');
            ul.style.listStyleType = 'none'; ul.style.padding = '0';
            clips.forEach(clip => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${escapeHtml(clip.videoTitle)}</strong><br><small>by ${escapeHtml(clip.channelTitle)}</small>`;
                li.style.cursor = 'pointer'; li.style.marginBottom = '10px';
                li.onclick = () => playYouTubeClip(clip.videoId, clip.startTime);
                ul.appendChild(li);
            });
            elements.videoResultsList.appendChild(ul);
        } catch (error) {
            console.error("Error fetching video clips:", error);
            elements.videoResultsList.innerHTML = `<p>Failed to load video clips.</p>`;
        }
    }

    function playYouTubeClip(videoId, startTime) {
        if (elements.videoPlayerContainer) {
            elements.videoPlayerContainer.innerHTML = '<div id="youtube-player"></div>';
            elements.videoPlayerContainer.style.display = 'block';
        }
        try {
            ytPlayer = new YT.Player('youtube-player', {
                height: '100%', width: '100%', videoId: videoId,
                playerVars: { 'autoplay': 1, 'start': Math.round(startTime), 'controls': 1 },
                events: { 'onReady': (event) => event.target.playVideo() }
            });
        } catch (e) {
            console.error("Error creating YouTube player:", e);
            elements.videoPlayerContainer.innerHTML = "<p>Error loading video player.</p>";
        }
    }
    
    // --- Initial setup and event listeners ---
    if(elements.createStackBtn) elements.createStackBtn.addEventListener('click', createNewStack);
    if(elements.saveNewFlashcardBtn) elements.saveNewFlashcardBtn.addEventListener('click', saveNewManualFlashcard);
    if(elements.submitImportBtn) elements.submitImportBtn.addEventListener('click', handleStackImport);
    
    fetchAndDisplayStacks();
});