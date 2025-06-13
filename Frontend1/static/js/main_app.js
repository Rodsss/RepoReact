document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleButton = document.getElementById('sidebar-toggle');

    // Ensure all elements exist before adding the event listener
    if (sidebar && mainContent && toggleButton) {
        toggleButton.addEventListener('click', () => {
            // This is the key: toggle the class on BOTH elements.
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('collapsed');
        });
    }
});