export class CanvasManager {
    constructor(gameController) {
        this.gameController = gameController;
    }
    // ========================= MAP CANVAS AND RADAR MINIMAP ========================= //

    // A method to correctly center the viewport on a given object
    focusCameraOnObject(object) {
        if (!object) return;

        // Calculate the target viewport position to center the object
        let targetX = object.x - this.gameController.canvas.width / 2;
        let targetY = object.y - this.gameController.canvas.height / 2;

        // Clamp the target position to ensure it stays within the world boundaries
        this.gameController.viewport.x = Math.max(0, Math.min(this.gameController.WORLD_WIDTH - this.gameController.canvas.width, targetX));
        this.gameController.viewport.y = Math.max(0, Math.min(this.gameController.WORLD_HEIGHT - this.gameController.canvas.height, targetY));
    }

    // Display edge indicators
    checkAndDisplayEdgeIndicators() {
        // Edge indicators
        const topIndicator = document.getElementById('top-indicator');
        const bottomIndicator = document.getElementById('bottom-indicator');
        const leftIndicator = document.getElementById('left-indicator');
        const rightIndicator = document.getElementById('right-indicator');

        // Reset indicators to a hidden state
        topIndicator.style.display = 'none';
        bottomIndicator.style.display = 'none';
        leftIndicator.style.display = 'none';
        rightIndicator.style.display = 'none';

        // Show indicator if the viewport is at a boundary
        if (this.gameController.viewport.y <= 0) {
            topIndicator.style.display = 'block';
        }
        if (this.gameController.viewport.y >= this.gameController.WORLD_HEIGHT - this.gameController.canvas.height) {
            bottomIndicator.style.display = 'block';
        }
        if (this.gameController.viewport.x <= 0) {
            leftIndicator.style.display = 'block';
        }
        if (this.gameController.viewport.x >= this.gameController.WORLD_WIDTH - this.gameController.canvas.width) {
            rightIndicator.style.display = 'block';
        }

        this.updateVerticalIndicatorHeight();
    }

    // Function to dynamically update the height of the vertical edge indicators
    updateVerticalIndicatorHeight() {
        // Get the main elements
        const mainArea = document.getElementById('main-area');
        const commandBar = document.getElementById('command-bar');
        const topIndicator = document.getElementById('top-indicator');

        // Ensure all elements exist before proceeding
        if (!mainArea || !commandBar || !topIndicator) {
            console.error("Required elements not found. Check your HTML IDs.");
            return;
        }

        // The top and bottom indicators are 5px each.
        // The total offset for the vertical indicators is 10px.
        const totalIndicatorOffset = 10;

        // Set the height of the vertical indicators using a CSS custom property.
        document.documentElement.style.setProperty('--vertical-indicator-height', `calc(100% - ${totalIndicatorOffset}px)`);
    }

    // Display radar minimap indicators: viewport indicator, hq indicator, building indicator, map canvas borders indicator
    drawMiniMapIndicators() {
        const miniMapCanvas = document.getElementById('miniMapCanvas');
        if (!miniMapCanvas) {
            console.warn("Mini-map canvas element with ID 'miniMapCanvas' not found.");
            return;
        }
        const miniMapCtx = miniMapCanvas.getContext('2d');

        if (this.gameController.WORLD_WIDTH === 0 || this.gameController.WORLD_HEIGHT === 0) {
            return;
        }

        miniMapCtx.clearRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);

        // Calculate a single, uniform scale factor to preserve aspect ratio of the world.
        const scale = Math.min(
            miniMapCanvas.width / this.gameController.WORLD_WIDTH,
            miniMapCanvas.height / this.gameController.WORLD_HEIGHT
        );

        // Calculate offsets to center the scaled world view within the square radar.
        // this.gameController correctly centers the rectangular world map within the square minimap.
        const offsetX = (miniMapCanvas.width - this.gameController.WORLD_WIDTH * scale) / 2;
        const offsetY = (miniMapCanvas.height - this.gameController.WORLD_HEIGHT * scale) / 2;

        // Draw the green dotted outline for the entire world map.
        // this.gameController outline is now a rectangle with the same proportions as the game world.
        miniMapCtx.setLineDash([10, 10]);
        miniMapCtx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.strokeRect(offsetX, offsetY, this.gameController.WORLD_WIDTH * scale, this.gameController.WORLD_HEIGHT * scale);
        miniMapCtx.setLineDash([]); // Reset the line dash for other drawings.

        // Define a minimum size for indicators to ensure visibility
        const MIN_BUILDING_SIZE = 5;

        // Draw the viewport indicator using the uniform scale.
        // this.gameController will correctly show a rectangle for your viewport on the minimap.
        const indicatorX = this.gameController.viewport.x * scale + offsetX;
        const indicatorY = this.gameController.viewport.y * scale + offsetY;
        const indicatorWidth = this.gameController.canvas.width * scale;
        const indicatorHeight = this.gameController.canvas.height * scale;

        miniMapCtx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        miniMapCtx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);

        miniMapCtx.save();
        miniMapCtx.shadowColor = 'rgba(255, 255, 0, 1)';
        miniMapCtx.shadowBlur = 10;
        miniMapCtx.strokeStyle = 'yellow';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
        miniMapCtx.restore();

        // Store HQ data to draw its outline later
        let friendlyHqData = null;
        let enemyHqData = null;

        // Draw indicators for all buildings (filled rectangle)
        for (const id in this.gameController.gameState.gameObjects) {
            const obj = this.gameController.gameState.gameObjects[id];

            if (obj.itemData && obj.itemData.isStatic) {
                // Apply the same scaling and offset to all objects
                const miniMapX = obj.x * scale + offsetX;
                const miniMapY = obj.y * scale + offsetY;
                const miniMapWidth = Math.max(obj.itemData.width * scale, MIN_BUILDING_SIZE);
                const miniMapHeight = Math.max(obj.itemData.height * scale, MIN_BUILDING_SIZE);

                const color = (obj.team === 'friend') ? 'blue' : 'red';

                miniMapCtx.fillStyle = color;
                miniMapCtx.fillRect(miniMapX - miniMapWidth / 2, miniMapY - miniMapHeight / 2, miniMapWidth, miniMapHeight);

                // Save the HQ's data to draw the outline later
                if (obj.itemData.type === 'Command') {
                    if (obj.team === 'friend') {
                        friendlyHqData = { miniMapX, miniMapY, miniMapWidth, miniMapHeight };
                    } else {
                        enemyHqData = { miniMapX, miniMapY, miniMapWidth, miniMapHeight };
                    }
                }
            }
        }

        // Function to draw the HQ outline
        const drawHqOutline = (hqData) => {
            if (hqData) {
                const { miniMapX, miniMapY, miniMapWidth, miniMapHeight } = hqData;
                miniMapCtx.save();
                miniMapCtx.shadowColor = 'rgba(255, 255, 0, 1)';
                miniMapCtx.shadowBlur = 10;
                miniMapCtx.strokeStyle = 'yellow';
                miniMapCtx.lineWidth = 1.5;
                miniMapCtx.strokeRect(miniMapX - miniMapWidth / 2, miniMapY - miniMapHeight / 2, miniMapWidth, miniMapHeight);
                miniMapCtx.restore();
            }
        }

        // Draw the outlines for both HQs after drawing all buildings
        drawHqOutline(friendlyHqData);
        drawHqOutline(enemyHqData);
    }

    // The main update loop for game logic. Render game objects. Dynamically update resources, training timers
    update(deltaTime) {
        // Update all game objects
        for (const id in this.gameController.gameState.gameObjects) {
            const obj = this.gameController.gameState.gameObjects[id];
            // Pass deltaTime to the update method for consistent movement
            if (obj.update) {
                obj.update(deltaTime);
            }
        }

        // 🚨 CRITICAL: Check for completed production every frame 🚨
        this.gameController.buildingManager.checkCompletedProduction();

        // Handle resource updates separately
        this._updateResources();
    }

    // Updates the game's resources based on economic buildings. this.gameController function now checks each economic building individually for its production timer.
    _updateResources() {
        const currentTime = performance.now();

        for (const id in this.gameController.gameState.gameObjects) {
            const obj = this.gameController.gameState.gameObjects[id];

            if (obj.itemData && obj.itemData.type === 'Economic') {
                const timeSinceLastProduction = currentTime - obj.lastProductionTime;
                // The production interval should be read from the itemData
                const interval = obj.itemData.productionInterval || 5000;

                if (timeSinceLastProduction >= interval) {
                    // Get the resources this.gameController building produces
                    const resourcesProduced = obj.itemData.produces;

                    if (resourcesProduced) {
                        // Iterate over each resource and update it
                        for (const resource in resourcesProduced) {
                            const amount = resourcesProduced[resource];

                            // Add the amount to the current resource total
                            this.gameController.gameState.resources[resource] += amount;

                            // Call the animated UI update for this.gameController specific resource
                            this.gameController.uiController.updateResourceCountAnimated(resource, this.gameController.gameState.resources[resource]);
                        }
                    }
                    // Reset the timer for this.gameController building
                    obj.lastProductionTime = currentTime;
                }
            }
        }
    }

    // Destroy the currently selected player unit.
    destroySelectedPlayerUnit() {
        // Check if there are any selected units
        if (this.gameController.gameState.selectedUnits.length > 0) {
            // Get the first selected unit (or all of them in a loop for multi-selection)
            const unitToDestroy = this.gameController.gameState.selectedUnits[0];

            // Check if it belongs to the player's team
            if (unitToDestroy.team === 'friend') {
                console.log(`Destroying selected player unit with ID: ${unitToDestroy.id}`);
                this.removeObject(unitToDestroy);
                this.gameController.gameState.selectedUnits = []; // Clear the selection
                this.gameController.uiController.setStatus("Selected unit destroyed.");
            } else {
                console.log("The selected unit is not a player unit and cannot be destroyed.");
            }
        } else {
            console.log("No player unit is selected.");
            this.gameController.uiController.setStatus("No unit selected to destroy.");
        }
    }

    // Remove a game object from the game state.
    removeObject(objectToRemove) {
        if (objectToRemove && this.gameController.gameState.gameObjects[objectToRemove.id]) {
            delete this.gameController.gameState.gameObjects[objectToRemove.id];
            // Remove from selected units list if it's there
            this.gameController.gameState.selectedUnits = this.gameController.gameState.selectedUnits.filter(unit => unit.id !== objectToRemove.id);
            console.log(`Object with ID ${objectToRemove.id} removed from the game.`);
        }
    }

    // ========================= GAME ENGINE ========================= ///

    gameLoop(time) {
        const deltaTime = (time - this.gameController.lastTime) / 1000;
        this.gameController.lastTime = time;

        this.gameController.ctx.clearRect(0, 0, this.gameController.canvas.width, this.gameController.canvas.height);

        this.gameController.inputManager.handleKeyboardInput();
        this.update(deltaTime); // Call the new update method

        // Map edge indicators
        this.checkAndDisplayEdgeIndicators();
        this.drawMiniMapIndicators();

        // Apply translation to the canvas context
        this.gameController.ctx.save();
        this.gameController.ctx.translate(-this.gameController.viewport.x, -this.gameController.viewport.y);

        for (const id in this.gameController.gameState.gameObjects) {
            const obj = this.gameController.gameState.gameObjects[id];
            if (obj.draw) obj.draw();
        }

        this.gameController.ctx.restore();

        if (this.gameController.gameState.pendingBuilding) {
            const { width: buildingWidth, height: buildingHeight } = this.gameController.gameState.pendingBuilding;

            const mouseX = this.gameController.pendingBuildingCursorPosition.x;
            const mouseY = this.gameController.pendingBuildingCursorPosition.y;

            // Check for validity to determine color
            const isLocationClear = this.gameController.buildingManager._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight);
            const isWithinViewport = (
                mouseX - buildingWidth / 2 >= this.gameController.viewport.x &&
                mouseX + buildingWidth / 2 <= this.gameController.viewport.x + this.gameController.canvas.width &&
                mouseY - buildingHeight / 2 >= this.gameController.viewport.y &&
                mouseY + buildingHeight / 2 <= this.gameController.viewport.y + this.gameController.canvas.height
            );

            this.gameController.canPlaceBuilding = isLocationClear && isWithinViewport;

            const playerColor = this.gameController.gameState.playerColor || 'rgba(0,255,0,0.4)'; // Default to green if not set
            const transparentPlayerColor = rgbaFromColor(playerColor, 0.4); 

            const silhouetteColor = this.gameController.canPlaceBuilding ? transparentPlayerColor : 'rgba(255,0,0,0.4)';

            // FIX: Translate the context to draw the silhouette correctly relative to the viewport.
            this.gameController.ctx.save();
            this.gameController.ctx.translate(-this.gameController.viewport.x, -this.gameController.viewport.y);
            this.gameController.ctx.fillStyle = silhouetteColor;
            this.gameController.ctx.fillRect(
                mouseX - buildingWidth / 2,
                mouseY - buildingHeight / 2,
                buildingWidth,
                buildingHeight
            );
            this.gameController.ctx.restore();
        }

        const livingObjects = {};
        for (const id in this.gameController.gameState.gameObjects) {
            const obj = this.gameController.gameState.gameObjects[id];
            if (obj.health > 0) {
                livingObjects[id] = obj;
            }
        }
        this.gameController.gameState.gameObjects = livingObjects;

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

function rgbaFromColor(color, alpha) {
    // Basic example: only handles 6-digit hex codes for simplicity
    if (color.startsWith('#') && color.length === 7) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    
    // Fallback/Error case for safety
    return `rgba(0,0,255,${alpha})`; // Default to transparent blue
}