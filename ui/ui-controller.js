export class UIController {
    constructor(productionItems) {
        this.productionItems = productionItems;
        this.productionGrid = document.getElementById('production-grid');
        this.tabButtons = document.querySelectorAll('.tab');
        this.panelStatus = document.getElementById('panel-status');
        this.gameController = null;
    }

    initializeUI() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const tabType = button.getAttribute('data-tab');
                
                if (tabType === 'produces') {
                    this.updateProductionQueueDisplay();
                } else {
                    this.renderProductionButtons(this.productionItems[tabType]);
                }
            });
        });
        document.querySelector('.tab[data-tab="units"]').click();
        this.setStatus("Ready.");
    }

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
    
    // NEW: Function to display items based on selected building's subtype
    updateProductionQueueDisplay() {
        this.productionGrid.innerHTML = '';
        const building = this.gameController.gameState.productionBuilding;
        if (!building) {
            this.setStatus("No production building selected.");
            return;
        }

        const buildingType = building.itemData.subtype;
        let itemsToDisplay = [];
        let statusMessage = "Displaying produces items.";

        if (buildingType === 'Production') {
            itemsToDisplay = this.productionItems.units;
        } else if (buildingType === 'Command') {
            itemsToDisplay = this.productionItems.buildings;
        } else {
            this.setStatus("This building does not produce anything.");
            return;
        }

        // If no items are available for the type
        if (itemsToDisplay.length === 0) {
            this.setStatus("No items to display for this building type.");
            return;
        }

        // Reuse the existing rendering function
        this.renderProductionButtons(itemsToDisplay);
        this.setStatus(statusMessage);
    }

    setStatus(message) {
        this.panelStatus.textContent = message;
    }

    clearProductionPanel() {
        const productionPanel = document.getElementById('production-grid');
        if (productionPanel) {
            productionPanel.innerHTML = '';
        }
    }

}
