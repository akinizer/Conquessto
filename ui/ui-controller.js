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

    fillProducesTab(selectedObject) {
        this.productionGrid.innerHTML = ''; // Clear previous buttons

        if (selectedObject && selectedObject.itemData) {
            // ✅ Use a new variable to hold the full list of potential items.
            let allPossibleItems = [];
            const itemType = selectedObject.itemData.type;

            if (itemType === "Production") {
                allPossibleItems = this.productionItems.units;
            } else if (itemType === "Command") {
                allPossibleItems = this.productionItems.buildings;
            }

            // 🎯 The crucial step: Filter the list based on the 'produces' array.
            const producesList = selectedObject.itemData.produces || [];
            const itemsToDisplay = allPossibleItems.filter(item => producesList.includes(item.name));
            
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