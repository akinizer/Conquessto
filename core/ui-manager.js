// /core/ui-manager.js

export class UIManager {
    constructor() {
        this.panelStatus = document.getElementById('panel-status');
        this.productionPanel = document.getElementById('production-panel');
        this.tabButtons = document.querySelectorAll('.tab');
        this.productionGrid = document.getElementById('production-grid');
        this.PRODUCTION_ITEMS = {
            "units": [
                { name: "Infantry", type: "Unit", cost: 50, time: 200, icon: "" }
            ],
            "buildings": [
                { name: "Barracks", type: "Building", cost: 200, time: 500, icon: "" }
            ]
        };
    }

    initializeUI(gameController) {
        // Set the gameController as a property for later use
        this.gameController = gameController;

        // Set up the tab button listeners
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const tabType = button.getAttribute('data-tab');
                // Call the new internal method
                this.renderProductionButtons(this.PRODUCTION_ITEMS[tabType]);
            });
        });
        // Click the default tab to show the initial buttons
        document.querySelector('.tab[data-tab="units"]').click();
        this.setStatus("Ready.");
    }

    // New method containing the rendering logic
    renderProductionButtons(items) {
        this.productionGrid.innerHTML = '';
        items.forEach(item => {
            const button = document.createElement('div');
            button.className = 'unit-button';
            button.textContent = item.name;

            button.onclick = () => {
                this.gameController.trainItem(item, button);
            };
            this.productionGrid.appendChild(button);
        });
    }

    setStatus(message) {
        this.panelStatus.textContent = message;
    }
    
    clearProductionPanel() {
        this.productionPanel.innerHTML = '';
    }
}