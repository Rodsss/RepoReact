// This function sets up the draggable resizers between panes.
function initializeResizablePanes() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const resizers = mainContent.querySelectorAll('.resizer');

    resizers.forEach(resizer => {
        let x = 0;
        let leftPane, rightPane, leftPaneWidth, rightPaneWidth;

        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            x = e.clientX;
            leftPane = this.previousElementSibling;
            rightPane = this.nextElementSibling;
            leftPaneWidth = leftPane.getBoundingClientRect().width;
            rightPaneWidth = rightPane.getBoundingClientRect().width;

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        function handleMouseMove(e) {
            const dx = e.clientX - x;
            const totalWidth = leftPaneWidth + rightPaneWidth;
            
            let newLeftWidth = leftPaneWidth + dx;
            let newRightWidth = rightPaneWidth - dx;

            // Prevent panes from getting too small
            if (newLeftWidth < 100 || newRightWidth < 100) {
                return;
            }

            // Update the grid layout by changing the fractional units
            const newGridTemplate = `${newLeftWidth}px 5px ${newRightWidth}px 5px ${mainContent.lastElementChild.getBoundingClientRect().width}px`;
            
            // For a simpler approach that works well with 3 panes:
            leftPane.style.width = `${newLeftWidth}px`;
            rightPane.style.width = `${newRightWidth}px`;
            
            // A more robust solution would convert these pixel values back to fractional units (fr)
            // to update the grid-template-columns of the parent.
        }

        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    });
}

// This function handles switching the main views (Languages, Desk, etc.)
function switchView(viewToShow) {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
    document.querySelectorAll('.menu-button').forEach(button => {
        button.classList.remove('active');
    });

    const newView = document.getElementById(`${viewToShow}-view`);
    if (newView) {
        newView.style.display = 'block';
        if (viewToShow === 'languages') { // The languages view is a grid
             newView.style.display = 'grid';
        }
    }

    const newButton = document.querySelector(`.menu-button[data-view="${viewToShow}"]`);
    if (newButton) {
        newButton.classList.add('active');
    }
}

// This is the main function that runs AFTER a user logs in.
function initializeApp() {
    console.log("User is logged in. Initializing main application.");

    // --- Setup for Main Navigation ---
    document.querySelectorAll('.menu-button[data-view]').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const view = button.dataset.view;
            switchView(view);
        });
    });

    // --- Setup for Collapsible Menus ---
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('click', (event) => {
            const header = event.target.closest('.collapsible-header');
            if (header) {
                header.parentElement.classList.toggle('active');
            }
        });
    }

    // --- Setup for Resizable Panes ---
    // Note: The resizable pane logic is complex. This is a simplified example.
    // For a production app, you might use a lightweight library for this.
    // initializeResizablePanes(); // Currently disabled for simplicity, can be enabled for testing.


    // --- Set Default View ---
    switchView('translate');
}


// --- PAGE LOAD ENTRYPOINT ---
// We are assuming the user is "logged in" for this design phase.
// In a real app, you would uncomment the auth lines.
document.addEventListener('DOMContentLoaded', () => {
    // import { initializeAuth } from './modules/auth.js';
    // initializeAuth(initializeApp);
    
    // For design purposes, we'll just run initializeApp directly.
    initializeApp();
});