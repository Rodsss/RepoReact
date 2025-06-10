// app.js
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pageViews = document.querySelectorAll('.page-view');

    // --- Element selectors for list management ---
    const newListInput = document.getElementById('new-list-name-input');
    const createListButton = document.getElementById('create-list-button');
    const customListsUl = document.getElementById('custom-lists-list');
    const loadingListsMsg = document.getElementById('loading-lists-msg');
    
    const API_BASE_URL = 'http://127.0.0.1:8000/api/v1'; 
    const USER_ID_PLACEHOLDER = 'temp_user_id_mvp';

    const escapeHtml = (unsafe) => {
        if (unsafe === null || typeof unsafe === 'undefined') return '';
        return unsafe.toString().replace(/[&<>"']/g, match => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#039;'})[match]);
    };

    // --- Page Navigation Logic ---
    function switchView(targetPageId) {
        pageViews.forEach(view => view.classList.remove('active'));
        const targetPageView = document.getElementById(targetPageId);
        if (targetPageView) {
            targetPageView.classList.add('active');
            if (targetPageId === 'translate-view') {
                fetchAndDisplayCustomLists();
            }
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
            const targetPageId = this.dataset.page + '-view';
            switchView(targetPageId);
        });
    });

    // --- Custom List CRUD Functions ---

    async function fetchAndDisplayCustomLists() {
        if (!customListsUl || !loadingListsMsg) return;
        try {
            loadingListsMsg.textContent = 'Loading lists...';
            loadingListsMsg.style.display = 'block';
            customListsUl.innerHTML = '';

            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/lists`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const lists = await response.json();
            
            loadingListsMsg.style.display = 'none';
            if (lists.length === 0) {
                customListsUl.innerHTML = '<li>No lists found. Create one!</li>';
                return;
            }

            lists.forEach(list => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="list-name">${escapeHtml(list.list_name)}</span>
                    <div class="list-actions">
                        <button class="edit-list-btn">Rename</button>
                        <button class="delete-list-btn">Delete</button>
                    </div>
                `;
                // Add click listener for showing items later
                // li.querySelector('.list-name').addEventListener('click', () => showItemsForList(list.list_id));
                
                li.querySelector('.edit-list-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    renameList(list.list_id, list.list_name);
                });
                li.querySelector('.delete-list-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteList(list.list_id, list.list_name);
                });
                customListsUl.appendChild(li);
            });
        } catch (error) {
            console.error("Failed to fetch custom lists:", error);
            loadingListsMsg.style.display = 'none';
            customListsUl.innerHTML = '<li>Error loading lists.</li>';
        }
    }

    async function createNewCustomList() {
        const listName = newListInput.value.trim();
        if (!listName) {
            alert('Please enter a name for the new list.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: USER_ID_PLACEHOLDER, list_name: listName })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to create list');
            
            alert(`List "${escapeHtml(result.list.list_name)}" created successfully!`);
            newListInput.value = '';
            fetchAndDisplayCustomLists();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    async function renameList(listId, oldName) {
        const newName = prompt(`Enter new name for list "${oldName}":`, oldName);
        if (!newName || newName.trim() === '' || newName.trim() === oldName) {
            return; // User cancelled or entered same name
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/lists/${listId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ list_name: newName.trim() })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to rename list');
            
            fetchAndDisplayCustomLists();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    async function deleteList(listId, listName) {
        if (!confirm(`Are you sure you want to delete the list "${listName}"?`)) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users/${USER_ID_PLACEHOLDER}/lists/${listId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to delete list');
            
            fetchAndDisplayCustomLists();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    // --- Initial Setup ---
    if (createListButton) {
        createListButton.addEventListener('click', createNewCustomList);
    }
    
    const initialActiveLink = document.querySelector('.nav-link.active');
    if (initialActiveLink) {
        const initialPageId = initialActiveLink.dataset.page + '-view';
        switchView(initialPageId);
    }
});