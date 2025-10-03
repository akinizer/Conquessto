import { ITEM_TYPES_MAP } from '../core/constants/battlefield_constants.js'; 
export class UIController {
    constructor(productionItems) {
        this.productionItems = productionItems;
        this.productionGrid = document.getElementById('production-grid');
        this.tabButtons = document.querySelectorAll('.tab');
        this.panelStatus = document.getElementById('panel-status');
        this.gameController = null;
        this.activeLocalTimerId = null;
        this.selectedObject = null;

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
        this.hoverPopup.style.zIndex = '100';

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

            const producingItemName = selectedObject.producingItemName;

            // ⬅️ GLOBAL TIMER: Check if the end time is in the future (still counting)
            const isCurrentlyCountingDown =
                selectedObject.localCountdownEnd > Date.now();

            // ⬅️ GLOBAL TIMER: Check if the end time has passed (ready for collection/spawn)
            const isFinishedAndAwaitingCollection =
                selectedObject.localCountdownEnd > 0 &&
                selectedObject.localCountdownEnd <= Date.now();
                

            if (isFinishedAndAwaitingCollection && selectedObject.producingItemName) {
                const item = this.findItemByName(selectedObject.producingItemName);

                if (item && ITEM_TYPES_MAP.unit.includes(item.type)) {
                    // Found a finished UNIT while filling the panel (due to reselect).  We force the auto-spawn/cleanup now.
                    this.onProductionReadyUnitItem(selectedObject);
                    // After this call, the building state is reset, and fillProducesTab will naturally redraw to show the IDLE state. We must return to prevent the rest of fillProducesTab from continuing with the old, finished state.
                    return;
                }
            }

            if (itemsToDisplay.length > 0) {

                itemsToDisplay.forEach(item => {
                    const button = document.createElement('button');
                    button.className = 'produces-button';

                    let hoverTimeout = null; // Local variable to hold the timer ID for this specific button
                    const HOVER_DELAY_MS = 2000; // Define your delay (e.g., 500ms or half a second)

                    // Event 1: mouseover (Start the timer)
                    button.addEventListener('mouseover', (e) => {
                        // Clear any existing timer for safety
                        if (hoverTimeout) {
                            clearTimeout(hoverTimeout);
                        }

                        // Start a new timer to show the popup after the delay
                        hoverTimeout = setTimeout(() => {
                            this.showProductionPopup(item, e.clientX, e.clientY);
                        }, HOVER_DELAY_MS);
                    });

                    // Event 2: mousemove (Update position without delay, but only after the first delay has passed)
                    // We only reposition if the popup is already visible
                    button.addEventListener('mousemove', (e) => {
                        if (this.hoverPopup.style.display === 'block') {
                            // Use a throttled utility for position updates if necessary to reduce lag here, 
                            // but repositioning is less taxing than the initial styling, so we'll omit throttling for simplicity.
                            this.showProductionPopup(item, e.clientX, e.clientY);
                        }
                    });

                    // Event 3: mouseout (Cancel the timer AND hide instantly)
                    button.addEventListener('mouseout', () => {
                        // 1. Always cancel the pending timer if it hasn't fired yet
                        if (hoverTimeout) {
                            clearTimeout(hoverTimeout);
                            hoverTimeout = null;
                        }

                        // 2. Hide the popup immediately
                        this.hideProductionPopup();
                    });

                    // 🔥 NEW PROTECTION: Check building status immediately on button creation
                    const isBuildingBusy = isFinishedAndAwaitingCollection || isCurrentlyCountingDown;

                    button.classList.remove('in-cooldown', 'disabled-by-activity');
                    button.style.pointerEvents = 'auto';
                    button.style.position = 'relative';

                    // If the building is busy (READY or COUNTING), apply the initial disabled state
                    if (isBuildingBusy) {
                        // Apply the base visual disable state before specific state checks
                        button.classList.add('disabled-by-activity');
                        button.style.pointerEvents = 'none';
                        this.startDisabledOverlay(button); // Draw the default transparent overlay
                    }

                    button.dataset.cost = JSON.stringify(item.cost);

                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'produces-button-name';
                    nameDiv.textContent = item.name;

                    const costDiv = document.createElement('div');
                    costDiv.className = 'produces-button-cost';

                    // State 1: READY FOR COLLECTION (Highest Priority)
                    if (isFinishedAndAwaitingCollection && item.name === producingItemName) {

                        // This block OVERWRITES the protective disable applied above
                        button.style.border = '2px solid #00ff00'; // Bright Green Border
                        button.style.backgroundColor = 'rgba(0, 100, 0, 0.7)'; // Darker Green Background
                        button.classList.remove('disabled-by-activity');
                        button.style.pointerEvents = 'auto'; // ENABLE CLICK
                        // Remove the generic busy overlay to show the button content/ready style
                        button.querySelectorAll('.local-cooldown-overlay').forEach(el => el.remove());
                    }

                    // State 2: LIVE COUNTDOWN (Second Priority: Use the existing live timer logic)
                    else if (isCurrentlyCountingDown && item.name === producingItemName) {
                        // This logic also overwrites the protective disable by calling startLiveProductionOverlay
                        this.startLiveProductionOverlay(button, selectedObject, item);
                        // The return is implicitly handled by the logic flow once this is done
                    }
                    // State 3: IDLE (Final fallback - Only runs if isBuildingBusy is FALSE)
                    else if (!isBuildingBusy) {
                        // Building is completely free. This is the ONLY time cleanup should run.
                        button.classList.remove('disabled-by-activity', 'in-cooldown');
                        button.style.pointerEvents = 'auto';

                        // No overlay should exist here, but we ensure it's removed for safety
                        button.querySelectorAll('.local-cooldown-overlay').forEach(el => el.remove());
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
                    button.onclick = () => {
                        // Check if the item is the ready one (Clicking the READY overlay)
                        const isReadyToCollect =
                            selectedObject.localCountdownEnd > 0 &&
                            selectedObject.localCountdownEnd <= Date.now() &&
                            item.name === selectedObject.producingItemName;

                        if (isReadyToCollect) {

                            // 1. PRODUCTION IS COMPLETE AND AWAITING COLLECTION

                            // Call the game controller logic for final placement
                            this.gameController.buildingManager.trainItem(item, selectedObject);

                            // 2. Clear the state on the building (The Store)
                            selectedObject.isLocallyProducing = false;
                            selectedObject.localCountdownEnd = 0; // ⬅️ GLOBAL TIMER: Reset
                            selectedObject.producingItemName = null;

                            // 3. Force a panel redraw to remove the "READY" overlay and re-enable all buttons
                            this.setStatus(`Collected ${item.name}!`);
                            this.fillProducesTab(selectedObject);
                            return;
                        }

                        // 4. Check if the building is actively busy (counting down)
                        const isStillCounting = selectedObject.localCountdownEnd > Date.now(); // ⬅️ GLOBAL TIMER: Check
                        if (isStillCounting) {
                            this.setStatus(`${selectedObject.producingItemName} is actively building...`);
                            return;
                        }

                        // ⭐ AFFORDABILITY CHECK BEFORE STARTING PRODUCTION
                        if (!this.gameController.resourceService.isAffordable(item.cost)) {
                            this.setStatus(`Insufficient resources to start production of ${item.name}.`);
                            return; // Block production if the cost isn't affordable
                        }

                        // 5. START NEW PRODUCTION
                        const durationSeconds = item.time || 10;
                        const durationMs = durationSeconds * 1000;

                        // STORE THE STATE
                        selectedObject.localCountdownEnd = Date.now() + durationMs; // ⬅️ GLOBAL TIMER: Set End Time
                        selectedObject.isLocallyProducing = true;
                        selectedObject.producingItemName = item.name;

                        this.startLiveProductionOverlay(button, selectedObject, item);
                        this.fillProducesTab(selectedObject);
                    };

                    this.productionGrid.appendChild(button);
                });
            } else {
                this.productionGrid.innerHTML = '<p>This building produces nothing.</p>';
                this.setStatus("Nothing to produce.");
            }
        } else {
            this.productionGrid.innerHTML = '';
        }
    }

    startLiveProductionOverlay(button, productionBuilding, item) {
        // 1. Clear any old timer (crucial when re-selecting the panel). LOCAL TIMER: ID for the visual
        if (this.activeLocalTimerId) {
            clearInterval(this.activeLocalTimerId);
            this.activeLocalTimerId = null;
        }

        // 🧹 Remove any existing overlay before applying a new one
        button.querySelectorAll('.local-cooldown-overlay').forEach(el => el.remove());

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

        // 2. Start the visual timer loop (LOCAL TIMER) reading from the stored GLOBAL TIMER state. Method to start or update the visual countdown overlay
        const intervalId = setInterval(() => {
            const remainingMs = productionBuilding.localCountdownEnd - Date.now(); // ⬅️ GLOBAL TIMER: Read
            const countdown = Math.ceil(remainingMs / 1000);

            overlay.textContent = Math.max(0, countdown);

            if (remainingMs <= 0) {
                clearInterval(intervalId);
                this.activeLocalTimerId = null;
                this.onProductionReady(productionBuilding);
            }
        }, 100);

        this.activeLocalTimerId = intervalId;
    }
    // Another Building in Progress Overlay
    startDisabledOverlay(button) {
        // Ensure any existing overlay is cleared first
        button.querySelectorAll('.local-cooldown-overlay').forEach(el => el.remove());

        // Create the overlay element
        const overlay = document.createElement('div');
        overlay.className = 'local-cooldown-overlay disabled-overlay'; // Keep the class for potential future CSS rules
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.7); /* DARKER, MORE TRANSPARENT BLACK */
            display: flex; justify-content: center; align-items: center; 
            font-size: 14px; color: #aaa; 
            z-index: 10;
            border-radius: inherit;
            pointer-events: none; /* Crucial: ensures overlay doesn't block mouseout/hover events */
        `;

        button.style.position = 'relative'; // Ensure button is a positioning context
        button.appendChild(overlay);
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

    // Method to set the selected object and start observing its production state
    refreshProductionPanel(selectedObject) {
        // 1. Clear any old observer before setting a new object
        if (this.productionObserverInterval) {
            clearInterval(this.productionObserverInterval);
            this.productionObserverInterval = null;
        }

        // 2. Store the new selected object
        this.selectedObject = selectedObject;

        // 3. Update the status bar with the selection name
        if (selectedObject && selectedObject.itemData) {
            this.setStatus(`${selectedObject.itemData.name} selected.`);

            // 4. Force the initial draw of the 'Produces' tab content
            this.fillProducesTab(selectedObject);

            // 5. 🔥 START OBSERVING THE PRODUCTION STATE
            this.observeProductionState(selectedObject);

        } else {
            this.setStatus("Ready.");
            this.clearProductionPanel();
        }
    }

    // 🔥 Continuously checks the state of the selected object
    observeProductionState(selectedObject) {
        // Store a copy of the key state variables to check for changes
        let lastAwaitingCollection = selectedObject.localCountdownEnd > 0 && selectedObject.localCountdownEnd <= Date.now();
        let lastProducing = selectedObject.isLocallyProducing;

        // Set up the interval (e.g., check every 1 second)
        this.productionObserverInterval = setInterval(() => {
            if (!this.selectedObject || this.selectedObject !== selectedObject) {
                // Stop if the building is deselected or changed
                clearInterval(this.productionObserverInterval);
                this.productionObserverInterval = null;
                return;
            }

            const currentAwaitingCollection =
                selectedObject.localCountdownEnd > 0 &&
                selectedObject.localCountdownEnd <= Date.now();
            const currentProducing = selectedObject.isLocallyProducing;

            // Check if the state has transitioned to 'READY' (Awaiting Collection)
            if (!lastAwaitingCollection && currentAwaitingCollection) {

                // 🚨 STATE TRANSITION DETECTED: Draw the "READY" UI
                this.fillProducesTab(selectedObject);
                this.setStatus(`Production of ${selectedObject.producingItemName} is READY!`);

            }

            // Check if the state has transitioned from 'READY' to 'CLEARED' (in case of a cancel/instant state change)
            else if (lastAwaitingCollection && !currentAwaitingCollection && !currentProducing) {
                // 🚨 STATE TRANSITION DETECTED: Redraw for IDLE state (e.g., after collection)
                this.fillProducesTab(selectedObject);
            }

            // Update the last state for the next check
            lastAwaitingCollection = currentAwaitingCollection;
            lastProducing = currentProducing;

        }, 1000); // Check every second
    }

    // Helper function to locate the item object from the productionItems list
    findItemByName(itemName) {
        const allItems = [...this.productionItems.units, ...this.productionItems.buildings];
        return allItems.find(item => item.name === itemName);
    }

    // Handles post-production processing, primarily called by the UI observer or Game Controller (for building items)
    onProductionReady(readyBuilding) {
        const item = this.findItemByName(readyBuilding.producingItemName);

        // Differentiates between building (needs click) and unit (auto-spawn) logic
        if (ITEM_TYPES_MAP.building.includes(item.type)) {
            this.onProductionReadyBuildingItem(readyBuilding);
        }
        else if (ITEM_TYPES_MAP.unit.includes(item.type)) {
            this.onProductionReadyUnitItem(readyBuilding);
        }
    }

    // Triggers UI refresh when a Building Item is ready for collection
    onProductionReadyBuildingItem(readyBuilding) {

        // Check if the ready building is the one currently selected by the player
        if (this.selectedObject === readyBuilding) {

            // Forces immediate panel refresh to show the READY state
            this.fillProducesTab(readyBuilding);
            this.setStatus(`Production of ${readyBuilding.producingItemName} is READY!`);

        } else {
            // Updates global status if the ready building is NOT selected
            this.setStatus(`${readyBuilding.itemData.name} is READY for collection!`);
        }
    }

    // Executes immediate unit spawning and production slot clearing
    onProductionReadyUnitItem(readyBuilding) {
        const itemName = readyBuilding.producingItemName;
        const item = this.findItemByName(itemName);

        if (!item) {
            console.error(`Item data not found for ${itemName}. Cannot collect.`);
            return;
        }

        // Executes the unit auto-spawn action
        this.gameController.buildingManager.trainItem(item, readyBuilding);

        // Clears the production state in the building
        readyBuilding.isLocallyProducing = false;
        readyBuilding.localCountdownEnd = 0;
        readyBuilding.producingItemName = null;

        // Updates the UI state and status
        if (this.selectedObject === readyBuilding) {
            this.setStatus(`Auto-collected and spawned ${item.name}!`);
            // Force a panel redraw to remove the "READY" overlay and re-enable all buttons
            this.fillProducesTab(readyBuilding);
        } else {
           // Updates global status if the finished building is NOT selected
            this.setStatus(`${readyBuilding.itemData.name} finished ${item.name}!`);
        }
    }
}