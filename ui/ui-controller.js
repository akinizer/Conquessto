export class UIController {
    constructor(productionItems) {
        this.productionItems = productionItems;
        this.productionGrid = document.getElementById('production-grid');
        this.tabButtons = document.querySelectorAll('.tab');
        this.panelStatus = document.getElementById('panel-status');
        this.gameController = null;
    }

    // Since there is only one tab, this method is simplified.
    initializeUI() {
        this.setStatus("Ready.");
    }

    // This method is now redundant and can be removed.
    // updateProductionQueueDisplay() { ... }

    setStatus(message) {
        this.panelStatus.textContent = message;
    }

    clearProductionPanel() {
        this.productionGrid.innerHTML = '';
    }

    // This is the core function for rendering buttons.
    // It is called by the GameController on object selection.
    fillProducesTab(selectedObject) {
        this.productionGrid.innerHTML = ''; // Clear previous buttons

        if (selectedObject) {
            let itemsToDisplay = [];
            
            if (selectedObject.type === "ProductionBuilding") {
                itemsToDisplay = this.productionItems.units;
            } else if (selectedObject.type === "CommandBuilding") {
                itemsToDisplay = this.productionItems.buildings;
            }
            
            if (itemsToDisplay.length > 0) {
                itemsToDisplay.forEach(item => {
                    const button = document.createElement('button');
                    button.textContent = item.name;
                    button.className = 'produces-button';

                    button.onclick = () => {
                        this.gameController.trainItem(item, button);
                    };
                    
                    this.productionGrid.appendChild(button);
                });
                // 🐛 FIX: Use selectedObject.itemData.name instead of selectedObject.name
                this.setStatus(`${selectedObject.itemData.name} produces tab updated.`);
            } else {
                this.productionGrid.innerHTML = '<p>This building produces nothing.</p>';
                this.setStatus("Nothing to produce.");
            }
        } else {
            this.productionGrid.innerHTML = '';
        }
    }
}