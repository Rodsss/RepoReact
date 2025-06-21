document.addEventListener('DOMContentLoaded', () => {

  
  








  

  // --- Controller for Pane 3 Tab Navigation ---
  const pane3 = document.getElementById('pane-three');
  if (pane3) {
    pane3.addEventListener('click', (event) => {
      const targetButton = event.target.closest('.pane-nav-button');

      // If the click wasn't on a button, do nothing.
      if (!targetButton) return;

      // Get all buttons and content panels within Pane 3 at the time of the click.
      const allNavButtons = pane3.querySelectorAll('.pane-nav-button');
      const allContentPanels = pane3.querySelectorAll('.pane-nav-content');
      
      // Deactivate all buttons and panels.
      allNavButtons.forEach(btn => btn.classList.remove('active'));
      allContentPanels.forEach(panel => panel.classList.remove('active'));

      // Activate the clicked button.
      targetButton.classList.add('active');

      // Activate the corresponding content panel.
      const targetId = targetButton.dataset.target;
      const targetPanel = pane3.querySelector(targetId); // Search only within Pane 3
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  }
});