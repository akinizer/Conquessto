// ui.js

const productionGrid = document.getElementById('production-grid');
const tabButtons = document.querySelectorAll('.tab');

export function initializeUI(gameManager, items) {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const tabType = button.getAttribute('data-tab');
            renderProductionButtons(gameManager, items[tabType]);
        });
    });
    document.querySelector('.tab[data-tab="units"]').click();
}

export function renderProductionButtons(gameManager, items) {
    productionGrid.innerHTML = "";
    items.forEach(item => {
        const button = document.createElement('div');
        button.className = 'unit-button';
        button.textContent = item.name;
        
        button.onclick = () => {
            gameManager.trainItem(item, button); // <-- NEW: Pass the button to the game manager
        };
        
        productionGrid.appendChild(button);
    });
}

export function clearProductionPanel() {
    productionGrid.innerHTML = "";
    document.getElementById('panel-status').textContent = "Ready.";
}

export function resetProductionButtons() {
    const buttons = document.querySelectorAll('.unit-button');
    buttons.forEach(button => {
        button.classList.remove('loading');
    });
}