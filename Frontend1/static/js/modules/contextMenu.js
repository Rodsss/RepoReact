// /static/js/modules/contextMenu.js

const menu = document.getElementById('context-menu');

// Close the menu if a click happens anywhere else on the page
document.addEventListener('click', () => hide());

function show(x, y, options) {
    menu.innerHTML = ''; // Clear previous options
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Create and add the new menu option elements
    options.forEach(option => {
        if (option.type === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            menu.appendChild(separator);
            return;
        }

        const button = document.createElement('button');
        button.className = 'context-menu-option';
        button.innerHTML = `<i class="bi ${option.icon}"></i> <span>${option.label}</span>`;
        button.addEventListener('click', () => {
            // When an option is clicked, dispatch a custom event with the details
            document.dispatchEvent(new CustomEvent('contextAction', {
                detail: { action: option.action, targetInfo: option.targetInfo }
            }));
            hide();
        });
        menu.appendChild(button);
    });

    menu.classList.remove('hidden');
}

function hide() {
    menu.classList.add('hidden');
}

// Export the public methods
const contextMenu = { show, hide };
export default contextMenu;