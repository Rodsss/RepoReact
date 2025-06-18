// This runs once the entire HTML page has been loaded and is ready.
document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard UI Initializing...");

    // --- 1. LOGIC FOR MAIN SIDEBAR NAVIGATION ---
    const viewContainer = document.querySelector('.main-content');
    const navButtons = document.querySelectorAll('.menu-button[data-view]');

    function switchView(viewToShow) {
        // Hide all main view containers
        if (viewContainer) {
            viewContainer.querySelectorAll('.view').forEach(view => {
                view.style.display = 'none';
            });
        }

        // Deactivate all sidebar buttons
        navButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Show the selected view
        const newView = document.getElementById(`${viewToShow}-view`);
        if (newView) {
            // The 'translate' view uses a grid, others can use block
            newView.style.display = (viewToShow === 'translate') ? 'grid' : 'block';
        }

        // Activate the selected sidebar button
        const newButton = document.querySelector(`.menu-button[data-view="${viewToShow}"]`);
        if (newButton) {
            newButton.classList.add('active');
        }
    }

    // Attach click listeners to all main navigation buttons
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const view = button.dataset.view;
            switchView(view);
        });
    });

    // --- 2. LOGIC FOR COLLAPSIBLE MENUS (in Pane 1) ---
    const paneOne = document.querySelector('.pane-one');
    if (paneOne) {
        paneOne.addEventListener('click', (event) => {
            const header = event.target.closest('.collapsible-header');
            if (header) {
                header.parentElement.classList.toggle('active');
            }
        });
    }

    // --- 3. LOGIC FOR "ADD NEW LIST" BOX (in Pane 2) ---
    const paneTwo = document.querySelector('.pane-two');
    if (paneTwo) {
        // Listen for clicks within the second pane
        paneTwo.addEventListener('click', (event) => {
            // Show/hide the input box when the '+' button is clicked
            if (event.target.closest('.action-button[title="Create new list"]')) {
                const container = document.getElementById('new-list-container');
                container.classList.toggle('visible');
                // Automatically focus the input field when it appears
                if (container.classList.contains('visible')) {
                    document.getElementById('new-list-input').focus();
                }
            }
        });

        // Add a listener to the input box to save on "Enter"
        const newListInput = document.getElementById('new-list-input');
        if (newListInput) {
            newListInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && newListInput.value.trim() !== '') {
                    event.preventDefault();
                    // This is where you would call your API in a real app
                    console.log(`New list created (mock): ${newListInput.value.trim()}`);
                    newListInput.value = ''; // Clear input
                    document.getElementById('new-list-container').classList.remove('visible'); // Hide box
                }
            });
        }
    }

    // --- Set the default view when the app loads ---
    switchView('translate');

});