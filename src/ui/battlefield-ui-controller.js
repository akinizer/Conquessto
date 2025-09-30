export class UIController {
    constructor(productionItems) {
        this.productionItems = productionItems;
        this.productionGrid = document.getElementById('production-grid');
        this.tabButtons = document.querySelectorAll('.tab');
        this.panelStatus = document.getElementById('panel-status');
        this.gameController = null;
        this.activeLocalTimerId = null;

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
        // 🚨 CRITICAL: Clean up the previous visual timer when the panel is refreshed
        if (this.activeLocalTimerId) {
            clearInterval(this.activeLocalTimerId);
            this.activeLocalTimerId = null;
        }
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

             // 🆕 READ STATE: Check if production is ongoing based on the stored time
            // Using the initialized properties (assumes Step 1 of initialization is done)
            const isCurrentlyProducing = 
                selectedObject.isLocallyProducing && 
                selectedObject.localCountdownEnd > Date.now();
                
            const producingItemName = selectedObject.producingItemName; 

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

                    // 🆕 REDRAW OVERLAY: If this item is the one being built, start the timer again
                    if (isCurrentlyProducing && item.name === producingItemName) {
                        this.startLiveProductionOverlay(button, selectedObject, item);
                    }
                    
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
                         // 🆕 GET TIME DYNAMICALLY AND CONVERT TO MS 🆕
                        // 1. Get the time in seconds from item.time (default to 10 seconds for safety if missing)
                        const durationSeconds = item.time || 10; 
                        
                        // 2. Convert seconds to milliseconds (1000 ms per second)
                        const durationMs = durationSeconds * 1000; 

                        // 1. Check if the building is already busy (reading from the persistent store)
                        if (selectedObject.isLocallyProducing) {
                            this.setStatus(`${item.name} is already building...`);
                            return;
                        }

                        // 2. 💾 STORE THE STATE ON THE BUILDING OBJECT 💾
                        // Store the exact future time when the production will finish (Date.now() + 10s).
                        selectedObject.localCountdownEnd = Date.now() + durationMs;
                        selectedObject.isLocallyProducing = true;
                        selectedObject.producingItemName = item.name; // Stores which button the countdown belongs to
                        
                        // 3. Start the UI overlay countdown (This method handles all visual changes)
                        this.startLiveProductionOverlay(button, selectedObject, item);
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

    startLiveProductionOverlay(button, productionBuilding, item) {
        // 1. Clear any old timer (crucial when re-selecting the panel)
        if (this.activeLocalTimerId) {
            clearInterval(this.activeLocalTimerId);
            this.activeLocalTimerId = null;
        }

        // Apply visual state (disabled button)
        button.classList.add('in-cooldown');
        button.style.pointerEvents = 'none';

        // Create and style the overlay
        const overlay = document.createElement('div');
        overlay.className = 'local-cooldown-overlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.8); color: white;
            display: flex; justify-content: center; align-items: center;
            font-size: 24px; font-weight: bold; z-index: 10;
            border-radius: inherit;
        `;
        button.style.position = 'relative';
        button.appendChild(overlay);

        this.setStatus(`Production of ${item.name} in progress...`);

        // 2. Start the timer loop reading from the stored time
        const intervalId = setInterval(() => {
            // Read the end time from the persistent store and calculate remaining time
            const remainingMs = productionBuilding.localCountdownEnd - Date.now();
            const countdown = Math.ceil(remainingMs / 1000);
            
            // Update the UI text
            overlay.textContent = Math.max(0, countdown);

            if (remainingMs <= 0) {
                clearInterval(intervalId);
                this.activeLocalTimerId = null;
                
                // 3. Trigger Game Logic
                this.gameController.trainItem(item, button); 
                
                // 4. Reset state on the building (Cleanup the store)
                productionBuilding.isLocallyProducing = false;
                productionBuilding.producingItemName = null;
                
                // 5. Cleanup UI
                if (button.contains(overlay)) {
                    button.removeChild(overlay);
                }
                button.classList.remove('in-cooldown');
                button.style.pointerEvents = 'auto';

                this.setStatus(`${item.name} is ready!`);
            }
        }, 100); // Ticks every 100ms for smoother visual update

        this.activeLocalTimerId = intervalId;
    }

    // Method to show the hover popup with description, cost, and time
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

    // Method to hide the hover popup
    hideProductionPopup() {
        this.hoverPopup.style.display = 'none';
    }

    // Method to update the hover popup
    updateHoverPopup(gameObject, clientX, clientY) {
        if (gameObject) {
            const shortDescription = gameObject.itemData.description || 'No description available.';
            const costsHtml = `<span class="cost-group">` +
                Object.entries(gameObject.itemData.cost || {}).map(([resource, value]) => {
                    if (value > 0) {
                        let icon = '';
                        if (resource === 'credits') { icon = '©'; }
                        else if (resource === 'energy') { icon = '⚡️'; }
                        else if (resource === 'substance') { icon = '⚗'; }
                        return `${icon} ${value}`;
                    }
                    return '';
                }).join(' ') +
                `</span>`;

            const teamColor = gameObject.teamColor || (gameObject.team === 'friend' ? 'lightblue' : gameObject.team === 'foe' ? 'red' : 'gray');
            const playerName = gameObject.playerName || 'John Doe';

            this.hoverPopup.style.cssText = `
                position: absolute;
                background-color: rgba(30, 30, 30, 0.95);
                color: white;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                max-width: 250px;
                z-index: 1000;
                display: block;
                left: ${clientX + 15}px;
                top: ${clientY + 15}px;
            `;

            this.hoverPopup.innerHTML = `
                <div style="font-size: 16px; font-weight: bold; color: ${teamColor};">${playerName} <span style="font-weight: normal; color: white;">- ${gameObject.itemData.name}</span></div>
                <div style="font-size: 14px; margin-top: 5px;">${costsHtml}</div>
                <em style="font-size: 12px; color: #ccc;">${shortDescription}</em>
            `;
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