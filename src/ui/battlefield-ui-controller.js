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

        // Resources
        this.creditsValue = document.getElementById('credits-value');
        this.metalValue = document.getElementById('metal-value');
        this.energyValue = document.getElementById('energy-value');
    }

    initializeUI() {
        this.setStatus("Ready.");
        this.updateResourcesUI(this.gameController.gameState.resources);
    }

    updateResourcesUI(resources) {
        this.creditsValue.textContent = resources.credits;
        this.metalValue.textContent = resources.metal;
        this.energyValue.textContent = resources.energy;
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

                    // NEW: Add mouseover and mouseout event listeners
                    button.addEventListener('mouseover', (e) => {
                        this.showProductionPopup(item, e.clientX, e.clientY);
                    });

                    button.addEventListener('mouseout', () => {
                        this.hideProductionPopup();
                    });

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

    // UPDATED: Method to show the hover popup with description, cost, and time
   showProductionPopup(item, clientX, clientY) {
        // Build the cost string from the cost object
        const costItems = Object.entries(item.cost).filter(([key, value]) => value > 0);
        const costString = costItems.map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join(', ');

        this.hoverPopup.innerHTML = `
            <strong>${item.name}</strong><br>
            ${item.description || 'No description available.'}<br>
            Cost: ${costString}<br>
            Time: ${item.time}s
        `;
        this.hoverPopup.style.left = `${clientX + 15}px`;
        this.hoverPopup.style.top = `${clientY + 15}px`;
        this.hoverPopup.style.display = 'block';
    }

    // NEW: Method to hide the hover popup
    hideProductionPopup() {
        this.hoverPopup.style.display = 'none';
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