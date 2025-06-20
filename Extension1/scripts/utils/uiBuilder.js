// scripts/utils/uiBuilder.js
window.myproject1Utils = window.myproject1Utils || {};

window.myproject1Utils.buildMenuDOM = function (selectedText) {
  const menuContainer = document.createElement("div");
  menuContainer.id = "project1-inpage-menu";

  // --- Start of Corrected DOM Element Creation ---

  // Selected text display
  const pSelect = document.createElement("p");
  pSelect.id = "project1-selected-text-paragraph"; // Ensure your CSS targets this ID if needed
  const em = document.createElement("em");
  // Truncate text if it's too long
  const truncatedText =
    selectedText.length > 50
      ? selectedText.substring(0, 47) + "..."
      : selectedText; // Adjusted truncation
  em.textContent = truncatedText.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Basic HTML escaping

  pSelect.appendChild(document.createTextNode('Selected: "'));
  pSelect.appendChild(em);
  pSelect.appendChild(document.createTextNode('"'));
  menuContainer.appendChild(pSelect);

  // Button 1: Visit Our Site
  const buttonVisitSite = document.createElement("button");
  buttonVisitSite.innerHTML = "🌐 Visit Our Site"; // Using innerHTML for the emoji
  buttonVisitSite.dataset.action = "visit-our-site";
  menuContainer.appendChild(buttonVisitSite);

  // Button 2: Translate
  const buttonTranslate = document.createElement("button");
  buttonTranslate.textContent = "Translate";
  buttonTranslate.dataset.action = "translate-text";
  menuContainer.appendChild(buttonTranslate);

  // Button 3: Collect Text
  const buttonCollect = document.createElement("button");
  buttonCollect.textContent = "Collect";
  buttonCollect.dataset.action = "collect-text";
  menuContainer.appendChild(buttonCollect);

  // Button 4: Dive Text
  const buttonDive = document.createElement("button");
  buttonDive.textContent = "Dive";
  buttonDive.dataset.action = "dive-text";
  menuContainer.appendChild(buttonDive);

  // Translation Area (initially hidden, styling should primarily be from CSS)
  const translationArea = document.createElement("div");
  translationArea.id = "project1-translation-area";
  // translationArea.style.display = 'none'; // CSS should handle this: #project1-translation-area { display: none; }
  // translationArea.style.marginTop = '10px'; // Prefer these in CSS
  // translationArea.style.paddingTop = '10px'; // Prefer these in CSS
  // translationArea.style.borderTop = '1px solid #eee'; // Prefer these in CSS
  menuContainer.appendChild(translationArea);

  // --- End of Corrected DOM Element Creation ---

  return menuContainer; // This is the single, correct return statement for the function
}; // This correctly closes the buildMenuDOM function
