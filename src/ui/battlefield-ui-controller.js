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
        this.productionGrid.innerHTML = '';
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

            const currentResources = this.gameController.gameState.resources;

            if (itemsToDisplay.length > 0) {
                itemsToDisplay.forEach(item => {
                    const button = document.createElement('button');
                    button.className = 'produces-button';
                    button.dataset.cost = JSON.stringify(item.cost);
                    
                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'produces-button-name';
                    nameDiv.textContent = item.name;

                    const costDiv = document.createElement('div');
                    costDiv.className = 'produces-button-cost';
                    
                    if (item.cost && Object.keys(item.cost).length > 0) {
                        for (const resource in item.cost) {
                            if (item.cost[resource] > 0) {
                                const costItemDiv = document.createElement('div');
                                
                                // Added classes to make the text white and align the icon and value
                                costItemDiv.className = 'cost-item flex items-center justify-between p-3 rounded-md bg-gray-700 text-white';
                                
                                costItemDiv.dataset.resource = resource;
                                
                                let icon = '';
                                if (resource === 'credits') { icon = '©'; }
                                else if (resource === 'energy') { icon = '⚡️'; }
                                else if (resource === 'substance') { icon = '⚗'; }
                                
                                costItemDiv.innerHTML = `<span class="resource-icon">${icon}</span> <span>${item.cost[resource]}</span>`;
                                costDiv.appendChild(costItemDiv);
                            }
                        }
                    }
                    
                    button.appendChild(nameDiv);
                    button.appendChild(costDiv);

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
                this.updateProductionButtons();
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

     updateResourceCountAnimated(resource, finalValue) {
        // Use the correct HTML IDs from your index.html
        const resourceElement = document.getElementById(`${resource}-value`);
        if (!resourceElement) {
            console.error(`UI element for resource '${resource}-value' not found.`);
            return;
        }

        const currentValue = parseInt(resourceElement.textContent, 10);
        const duration = 500; // Animation duration in milliseconds
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const animatedValue = Math.floor(currentValue + (finalValue - currentValue) * progress);
            
            resourceElement.textContent = animatedValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
}