import { GameState } from './battlefield-game-state.js';

import { DataManager } from './battlefield-data-manager.js';

import { BuildingManager } from './submanagers/BuildingManager.js';
import { InputManager } from './submanagers/InputManager.js';

export class GameController {
    constructor(canvas, uiController) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.uiController = uiController;
        this.gameState = new GameState();
        // Initialize credits to 0 to prevent "NaN" error.
        this.gameState.resources = {
            credits: 10000, // Initialize credits here
            energy: 0,
            metal: 0,
            substance: 0
        };
        this.lastTime = performance.now(); // For delta time calculation

        // Load JSON data of units and buildings
        this.dataManager = new DataManager();
        this.dataManager.loadProductionData().then(() => {
            console.log('Game data is ready.');
        }).catch(error => {
            console.error('Failed to load game data:', error);
        });

        this.inputManager = new InputManager(this, this.CursorManager);

        // Event listeners for mouse interaction
        this.canvas.addEventListener('mousedown', (event) => this.inputManager.onCanvasLeftClick(event));
        this.canvas.addEventListener('contextmenu', (event) => this.inputManager.onCanvasRightClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.inputManager.onCanvasMouseMove(event));
        this.canvas.addEventListener('mouseleave', () => this.inputManager.onCanvasMouseLeave());

        // Keyboard listeners for camera control
        this.keys = {};
        document.addEventListener('keydown', (event) => { this.keys[event.key] = true; });
        document.addEventListener('keyup', (event) => { this.keys[event.key] = false; });

        this.uiController.gameController = this;
        this.uiController.initializeUI();

        this.pendingBuildingCursorPosition = { x: 0, y: 0 };
        this.canPlaceBuilding = true;

        // World dimensions (4x the canvas size)
        this.WORLD_WIDTH = this.canvas.width * 4;
        this.WORLD_HEIGHT = this.canvas.height * 4;

        // Initialize the viewport (camera)
        this.viewport = { x: 0, y: 0 };
        this.panInterval = null;
        this.mousePosition = { x: 0, y: 0 };

        //Submanagers
        this.buildingManager = new BuildingManager(this);        

        this.gameLoop();
    }

    // ========================= MAP CANVAS AND RADAR MINIMAP ========================= //

    // A method to correctly center the viewport on a given object
    focusCameraOnObject(object) {
        if (!object) return;

        // Calculate the target viewport position to center the object
        let targetX = object.x - this.canvas.width / 2;
        let targetY = object.y - this.canvas.height / 2;

        // Clamp the target position to ensure it stays within the world boundaries
        this.viewport.x = Math.max(0, Math.min(this.WORLD_WIDTH - this.canvas.width, targetX));
        this.viewport.y = Math.max(0, Math.min(this.WORLD_HEIGHT - this.canvas.height, targetY));
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
        if (this.viewport.y <= 0) {
            topIndicator.style.display = 'block';
        }
        if (this.viewport.y >= this.WORLD_HEIGHT - this.canvas.height) {
            bottomIndicator.style.display = 'block';
        }
        if (this.viewport.x <= 0) {
            leftIndicator.style.display = 'block';
        }
        if (this.viewport.x >= this.WORLD_WIDTH - this.canvas.width) {
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

        if (this.WORLD_WIDTH === 0 || this.WORLD_HEIGHT === 0) {
            return;
        }

        miniMapCtx.clearRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);

        // Calculate a single, uniform scale factor to preserve aspect ratio of the world.
        const scale = Math.min(
            miniMapCanvas.width / this.WORLD_WIDTH,
            miniMapCanvas.height / this.WORLD_HEIGHT
        );

        // Calculate offsets to center the scaled world view within the square radar.
        // This correctly centers the rectangular world map within the square minimap.
        const offsetX = (miniMapCanvas.width - this.WORLD_WIDTH * scale) / 2;
        const offsetY = (miniMapCanvas.height - this.WORLD_HEIGHT * scale) / 2;

        // Draw the green dotted outline for the entire world map.
        // This outline is now a rectangle with the same proportions as the game world.
        miniMapCtx.setLineDash([10, 10]);
        miniMapCtx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.strokeRect(offsetX, offsetY, this.WORLD_WIDTH * scale, this.WORLD_HEIGHT * scale);
        miniMapCtx.setLineDash([]); // Reset the line dash for other drawings.

        // Define a minimum size for indicators to ensure visibility
        const MIN_BUILDING_SIZE = 5;

        // Draw the viewport indicator using the uniform scale.
        // This will correctly show a rectangle for your viewport on the minimap.
        const indicatorX = this.viewport.x * scale + offsetX;
        const indicatorY = this.viewport.y * scale + offsetY;
        const indicatorWidth = this.canvas.width * scale;
        const indicatorHeight = this.canvas.height * scale;

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
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];

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
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            // Pass deltaTime to the update method for consistent movement
            if (obj.update) {
                obj.update(deltaTime);
            }
        }

        // 🚨 CRITICAL: Check for completed production every frame 🚨
        this.buildingManager.checkCompletedProduction();

        // Handle resource updates separately
        this._updateResources();
    }

    // Updates the game's resources based on economic buildings. This function now checks each economic building individually for its production timer.
    _updateResources() {
        const currentTime = performance.now();

        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];

            if (obj.itemData && obj.itemData.type === 'Economic') {
                const timeSinceLastProduction = currentTime - obj.lastProductionTime;
                // The production interval should be read from the itemData
                const interval = obj.itemData.productionInterval || 5000;

                if (timeSinceLastProduction >= interval) {
                    // Get the resources this building produces
                    const resourcesProduced = obj.itemData.produces;

                    if (resourcesProduced) {
                        // Iterate over each resource and update it
                        for (const resource in resourcesProduced) {
                            const amount = resourcesProduced[resource];

                            // Add the amount to the current resource total
                            this.gameState.resources[resource] += amount;

                            // Call the animated UI update for this specific resource
                            this.uiController.updateResourceCountAnimated(resource, this.gameState.resources[resource]);
                        }
                    }
                    // Reset the timer for this building
                    obj.lastProductionTime = currentTime;
                }
            }
        }
    }

    isAffordable(cost) {
        if (!cost) {
            return true;
        }
        for (const resource in cost) {
            if (!this.gameState.resources.hasOwnProperty(resource) || this.gameState.resources[resource] < cost[resource]) {
                return false;
            }
        }
        return true;
    }

    deductCost(cost) {
        if (!cost) {
            return;
        }
        for (const resource in cost) {
            if (this.gameState.resources.hasOwnProperty(resource)) {
                // Deduct the cost from the game state
                this.gameState.resources[resource] -= cost[resource];

                // NEW: Trigger the digit change animation with the final value
                this.uiController.updateResourceCountAnimated(resource, this.gameState.resources[resource]);
            }
        }
    }

    earnResources(amount) {
        if (!amount) {
            return;
        }
        for (const resource in amount) {
            if (this.gameState.resources.hasOwnProperty(resource)) {
                // Add the new resources to the game state
                this.gameState.resources[resource] += amount[resource];

                // Trigger the same animation with the new, final value
                this.uiController.updateResourceCountAnimated(resource, this.gameState.resources[resource]);
            }
        }
    }

    // Destroy the currently selected player unit.
    destroySelectedPlayerUnit() {
        // Check if there are any selected units
        if (this.gameState.selectedUnits.length > 0) {
            // Get the first selected unit (or all of them in a loop for multi-selection)
            const unitToDestroy = this.gameState.selectedUnits[0];

            // Check if it belongs to the player's team
            if (unitToDestroy.team === 'friend') {
                console.log(`Destroying selected player unit with ID: ${unitToDestroy.id}`);
                this.removeObject(unitToDestroy);
                this.gameState.selectedUnits = []; // Clear the selection
                this.uiController.setStatus("Selected unit destroyed.");
            } else {
                console.log("The selected unit is not a player unit and cannot be destroyed.");
            }
        } else {
            console.log("No player unit is selected.");
            this.uiController.setStatus("No unit selected to destroy.");
        }
    }

    // Remove a game object from the game state.
    removeObject(objectToRemove) {
        if (objectToRemove && this.gameState.gameObjects[objectToRemove.id]) {
            delete this.gameState.gameObjects[objectToRemove.id];
            // Remove from selected units list if it's there
            this.gameState.selectedUnits = this.gameState.selectedUnits.filter(unit => unit.id !== objectToRemove.id);
            console.log(`Object with ID ${objectToRemove.id} removed from the game.`);
        }
    }

    // ========================= GAME ENGINE ========================= ///

    gameLoop(time) {
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.inputManager.handleKeyboardInput();
        this.update(deltaTime); // Call the new update method

        // Map edge indicators
        this.checkAndDisplayEdgeIndicators();
        this.drawMiniMapIndicators();

        // Apply translation to the canvas context
        this.ctx.save();
        this.ctx.translate(-this.viewport.x, -this.viewport.y);

        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            if (obj.draw) obj.draw();
        }

        this.ctx.restore();

        if (this.gameState.pendingBuilding) {
            const { width: buildingWidth, height: buildingHeight } = this.gameState.pendingBuilding;

            const mouseX = this.pendingBuildingCursorPosition.x;
            const mouseY = this.pendingBuildingCursorPosition.y;

            // Check for validity to determine color
            const isLocationClear = this.buildingManager._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight);
            const isWithinViewport = (
                mouseX - buildingWidth / 2 >= this.viewport.x &&
                mouseX + buildingWidth / 2 <= this.viewport.x + this.canvas.width &&
                mouseY - buildingHeight / 2 >= this.viewport.y &&
                mouseY + buildingHeight / 2 <= this.viewport.y + this.canvas.height
            );

            this.canPlaceBuilding = isLocationClear && isWithinViewport;
            const silhouetteColor = this.canPlaceBuilding ? 'rgba(0,255,0,0.4)' : 'rgba(255,0,0,0.4)';

            // FIX: Translate the context to draw the silhouette correctly relative to the viewport.
            this.ctx.save();
            this.ctx.translate(-this.viewport.x, -this.viewport.y);
            this.ctx.fillStyle = silhouetteColor;
            this.ctx.fillRect(
                mouseX - buildingWidth / 2,
                mouseY - buildingHeight / 2,
                buildingWidth,
                buildingHeight
            );
            this.ctx.restore();
        }

        const livingObjects = {};
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            if (obj.health > 0) {
                livingObjects[id] = obj;
            }
        }
        this.gameState.gameObjects = livingObjects;

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}