export class UIController {
    constructor(productionItems) {
        this.productionItems = productionItems;
        this.productionGrid = document.getElementById('production-grid');
        this.tabButtons = document.querySelectorAll('.tab');
        this.panelStatus = document.getElementById('panel-status');
        this.gameController = null;

        // NEW: Create and style the hover popup element
        this.hoverPopup = document.createElement('div');
        this.hoverPopup.id = 'hover-popup';
        document.body.appendChild(this.hoverPopup);

        // Apply basic inline styles for the popup
        this.hoverPopup.style.position = 'absolute';
        this.hoverPopup.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.hoverPopup.style.color = 'white';
        this.hoverPopup.style.padding = '5px';
        this.hoverPopup.style.border = '1px solid white';
        this.hoverPopup.style.borderRadius = '3px';
        this.hoverPopup.style.display = 'none'; // Initially hidden
        this.hoverPopup.style.pointerEvents = 'none'; // Prevents it from interfering with mouse events
    }

    initializeUI() {
        this.setStatus("Ready.");
    }

    setStatus(message) {
        this.panelStatus.textContent = message;
    }

    clearProductionPanel() {
        this.productionGrid.innerHTML = '';
    }

    fillProducesTab(selectedObject) {
        this.productionGrid.innerHTML = ''; // Clear previous buttons

        if (selectedObject && selectedObject.itemData) {
            let allPossibleItems = [];
            const itemType = selectedObject.itemData.type;

            if (itemType === "Production") {
                allPossibleItems = this.productionItems.units;
            } else if (itemType === "Command") {
                allPossibleItems = this.productionItems.buildings;
            }

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

    // NEW: Method to update the hover popup
    updateHoverPopup(gameObject, clientX, clientY) {
        if (gameObject) {
            this.hoverPopup.innerHTML = `
                <strong>${gameObject.itemData.name}</strong><br>
                Health: ${gameObject.health || 'N/A'}/${gameObject.itemData.maxHealth || 'N/A'}<br>
                Type: ${gameObject.itemData.type}
            `;
            // Position the popup slightly offset from the cursor
            this.hoverPopup.style.left = `${clientX + 15}px`;
            this.hoverPopup.style.top = `${clientY + 15}px`;
            this.hoverPopup.style.display = 'block';
        } else {
            this.hoverPopup.style.display = 'none';
        }
    }
}