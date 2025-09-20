import { GameState } from './battlefield-game-state.js';
import { Unit } from '../entities/Unit.js';
import { ProductionBuilding } from '../entities/ProductionBuilding.js';
import { CommandBuilding } from '../entities/CommandBuilding.js';
import { EconomicBuilding } from '../entities/EconomicBuilding.js';
import { OtherBuilding } from '../entities/OtherBuilding.js';
import { DataManager } from './battlefield-data-manager.js';

export class GameController {
    constructor(canvas, uiController) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.uiController = uiController;
        this.gameState = new GameState();
        // FIXED: Initialize credits to 0 to prevent "NaN" error.
        this.gameState.resources = {
            energy: 100,
            metal: 0,
            credits: 0 // Initialize credits here
        };
        this.lastTime = performance.now(); // For delta time calculation
        // Removed the global resourceUpdateTime timer as it's now handled per-building.

        this.dataManager = new DataManager();
        this.dataManager.loadProductionData().then(() => {
            console.log('Game data is ready.');
        }).catch(error => {
            console.error('Failed to load game data:', error);
        });

        // Event listeners for mouse interaction
        this.canvas.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        this.canvas.addEventListener('contextmenu', (event) => this.onCanvasRightClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.onCanvasMouseMove(event));
        this.canvas.addEventListener('mouseleave', () => this.onCanvasMouseLeave());

        // New keyboard listeners for camera control
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
        this.viewport = {
            x: 0,
            y: 0
        };

        this.gameLoop();
    }

    // MECHANISMS //
    buildBuilding(team, x, y, itemData) {
        const id = this.gameState.getNextId();
        let building;

        // FIX: Check the itemData type to create the correct building object.
        if (itemData.type === "Production") {
            building = new ProductionBuilding(id, team, x, y, this.canvas, this, itemData);
        } else if (itemData.type === "Command") {
            building = new CommandBuilding(id, team, x, y, this.canvas, this, itemData);
        } else if (itemData.type === "Economic") {
            // NEW: Instantiate an EconomicBuilding for economic types.
            building = new EconomicBuilding(id, team, x, y, this.canvas, this, itemData);
        } else {
            // Default to the specific OtherBuilding class for other types.
            building = new OtherBuilding(id, team, x, y, this.canvas, this, itemData);
        }
        
        // NEW: Set the initial production time for economic buildings.
        if (building instanceof EconomicBuilding) {
            building.lastProductionTime = performance.now();
        }

        this.gameState.addObject(building);
        return building;
    }

    spawnUnit(team, x, y, itemData) {
        const id = this.gameState.getNextId();
        // Pass the entire itemData object to the Unit constructor
        console.log(itemData)
        const unitWidth = itemData.width || 30;
        const unitHeight = itemData.height || 30;
        const unit = new Unit(id, team, x, y, unitWidth, unitHeight, this.canvas, this, itemData);
        this.gameState.addObject(unit);
        return unit;
    }
    
    // 🛠️ NEW: A new method to place a building on the map.
    // This is called from main.js to place the starting HQ.
    placeBuilding(itemData, team, x, y) {
        // Build the building and add it to the game state.
        const newBuilding = this.buildBuilding(team, x, y, itemData);
        
        // Deselect any previous building to avoid conflicts.
        if (this.gameState.productionBuilding) {
            this.gameState.productionBuilding.deselect();
        }
        
        // Make the newly placed building the primary production building.
        this.gameState.productionBuilding = newBuilding;
        
        // Select the new building so the UI immediately reflects its production options.
        this.gameState.productionBuilding.select();
        
        this.uiController.setStatus(`${itemData.name} placed successfully.`);
        return newBuilding;
    }


    trainItem(item, button) {
        const units = this.dataManager.getProductionItems().units;
        const buildings = this.dataManager.getProductionItems().buildings;

        // ✅ check if it's a unit
        if (units.some(u => u.name === item.name)) {
            if (!this.gameState.productionBuilding) {
                this.uiController.setStatus("Select a production building to train units!");
                return;
            }

            const itemToQueue = units.find(u => u.name === item.name);
            this.gameState.productionBuilding.productionQueue.push({ item: itemToQueue, button: button });
            this.uiController.setStatus(`${itemToQueue.name} added to queue.`);
            return;
        }

        // ✅ check if it's a building
        if (buildings.some(b => b.name === item.name)) {
            this.gameState.pendingBuilding = item;
            this.uiController.setStatus(`Click on the map to place a ${item.name}.`);
            return;
        }

        // ❌ fallback
        this.uiController.setStatus("Unknown item type.");
    }

    // BUILDING PLACEMENT //

    _isAreaClear(x, y, width, height) {
        // The padding is a fixed value, but this function will now work with the scaled coordinates.
        const padding = 10;
        const paddedWidth = width + padding * 2;
        const paddedHeight = height + padding * 2;

        const newObjLeft = x - paddedWidth / 2;
        const newObjRight = x + paddedWidth / 2;
        const newObjTop = y - paddedHeight / 2;
        const newObjBottom = y + paddedHeight / 2;

        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];

            // Calculate existing object's bounding box
            const objLeft = obj.x - obj.width / 2;
            const objRight = obj.x + obj.width / 2;
            const objTop = obj.y - obj.height / 2;
            const objBottom = obj.y + obj.height / 2;

            if (
                newObjRight > objLeft &&
                newObjLeft < objRight &&
                newObjBottom > objTop &&
                newObjTop < objBottom
            ) {
                return false; // Collision detected
            }
        }
        return true; // No collisions found
    }

    isLocationClearForUnit(x, y, ignoreObject = null) {
        const { width, height } = this.dataManager.getProductionItems().units[0];
        return this._isAreaClear(x, y, width, height, ignoreObject);
    }
    isLocationClear(x, y, dimensions, ignoreObject = null) {
        const tempUnit = {
            x: x,
            y: y,
            width: dimensions.width,
            height: dimensions.height
        };
        const unitRadius = tempUnit.width / 2;
        
        for (const objId in this.gameState.gameObjects) {
            const otherObj = this.gameState.gameObjects[objId];
            console.log(otherObj)

            // Skip ignored object (the building itself) or non-solid objects
            if (otherObj === ignoreObject) continue;
            if (!Array.isArray(otherObj.tags) || !otherObj.tags.includes('solid')) {
                continue;
            }

            // Check for collision based on the other object's shape
            if (otherObj.tags.includes('structure')) {
                // Circle-to-Rectangle collision check
                const distX = Math.abs(tempUnit.x - otherObj.x);
                const distY = Math.abs(tempUnit.y - otherObj.y);

                const halfOtherWidth = otherObj.width / 2;
                const halfOtherHeight = otherObj.height / 2;

                if (distX > (halfOtherWidth + unitRadius) || distY > (halfOtherHeight + unitRadius)) {
                    continue; // No collision
                }
                if (distX <= halfOtherWidth || distY <= halfOtherHeight) {
                    return false; // Collision
                }

                const dx = distX - halfOtherWidth;
                const dy = distY - halfOtherHeight;
                if ((dx * dx + dy * dy) <= (unitRadius * unitRadius)) {
                    return false; // Collision at the corner
                }
            } else {
                // Circle-to-Circle collision check
                const distance = Math.sqrt(Math.pow(tempUnit.x - otherObj.x, 2) + Math.pow(tempUnit.y - otherObj.y, 2));
                const otherRadius = otherObj.width / 2;
                if (distance < unitRadius + otherRadius) {
                    return false; // Collision
                }
            }
        }
        return true; // No collisions found
    }


    // MOUSE EVENTS //
    
    onCanvasClick(event) {
        if (event.button !== 0) return;
        
        const mousePos = this.getMousePos(event);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;
        
        const clickedObject = this.getObjectAt(mouseX, mouseY);

        
        
        if (this.gameState.pendingBuilding) {
            const { width: buildingWidth, height: buildingHeight } = this.gameState.pendingBuilding;

            const isLocationClear = this._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight);
            
            // FIX: Correctly check if the building can be placed within the current viewport.
            const isWithinViewport = (
                mouseX - buildingWidth / 2 >= this.viewport.x &&
                mouseX + buildingWidth / 2 <= this.viewport.x + this.canvas.width &&
                mouseY - buildingHeight / 2 >= this.viewport.y &&
                mouseY + buildingHeight / 2 <= this.viewport.y + this.canvas.height
            );

            if (isLocationClear && isWithinViewport) {
                const newBuilding = this.buildBuilding("friend", mouseX, mouseY, this.gameState.pendingBuilding);
                this._selectObject(newBuilding);
                this.uiController.setStatus(`${this.gameState.pendingBuilding.name} placed.`);
                this.gameState.pendingBuilding = null;
            } else {
                this.uiController.setStatus("Cannot place building here. Ensure it's not on top of another object and is within the visible area.");
            }
            return;
        }

        // Use the new, centralized selection method
        this._selectObject(clickedObject);
    }

    _selectObject(object) {
        // Check if the selected object is the current production building
        const isSameProductionBuilding = this.gameState.productionBuilding && (object === this.gameState.productionBuilding);

        // If a different object is selected, deselect everything
        if (!isSameProductionBuilding) {
            this.gameState.selectedUnits.forEach(unit => unit.deselect());
            this.gameState.selectedUnits = [];
            if (this.gameState.productionBuilding) {
                this.gameState.productionBuilding.deselect();
                this.gameState.productionBuilding = null;
            }
        }

        if (object && object.itemData) {
            console.log(`Selected object data:`, object);

            switch (object.itemData.type) {
                case "Production":
                    // If it's the same production building, don't re-select it or reset the rally point.
                    if (!isSameProductionBuilding) {
                        this.gameState.productionBuilding = object;
                        this.gameState.productionBuilding.select();
                        this.uiController.setStatus(`${object.itemData.name} selected as primary.`);
                        
                        // Initialize rally point if it doesn't exist
                        if (!this.gameState.productionBuilding.rallyPoint) {
                            this.gameState.productionBuilding.rallyPoint = { x: object.x, y: object.y };
                        }
                    }
                    this.uiController.fillProducesTab(object);
                    break;
                case "Command":
                case "Economic":
                    this.uiController.setStatus(`${object.itemData.name} selected.`);
                    this.uiController.fillProducesTab(object);
                    break;
                case "Infantry":
                case "Offensive Vehicle":
                case "Transport Vehicle":
                case "Support Vehicle":
                case "Entrench Vehicle":
                case "Aircraft":
                case "Naval":
                case "Super Unit":
                    this.gameState.selectedUnits.push(object);
                    object.select();
                    this.uiController.setStatus(`Unit ${object.itemData.name} selected.`);
                    this.uiController.fillProducesTab(null);
                    break;
                default:
                    this.uiController.setStatus(`${object.itemData.name} selected.`);
                    this.uiController.fillProducesTab(null);
                    break;
            }
        } else {
            console.log('Nothing selected. All objects deselected.');
            this.uiController.setStatus("Ready.");
            this.uiController.fillProducesTab(null);
        }
    }
    onCanvasRightClick(event) {
        event.preventDefault();
        if (event.button !== 2) return;
        
        const mousePos = this.getMousePos(event);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;

        if (this.gameState.pendingBuilding) {
            this.gameState.pendingBuilding = null;
            this.uiController.setStatus("Building placement cancelled.");
            return;
        }

        // This is the correct logical flow.
        // Check if any units are selected first.
        if (this.gameState.selectedUnits.length > 0) {
            this.gameState.selectedUnits.forEach(unit => {
                unit.moveTo(mouseX, mouseY);
            });
            this.uiController.setStatus("Unit(s) moving.");
            return; // ✅ Crucial: Exit the function after handling unit movement.
        } 
        
        // Only if no units are selected, check for a production building to set a rally point.
        if (this.gameState.productionBuilding) {
            this.gameState.productionBuilding.rallyPoint.x = mouseX;
            this.gameState.productionBuilding.rallyPoint.y = mouseY;
            this.uiController.setStatus("Rally point set.");
        }
    }
    onCanvasMouseMove(event) {
        try {
            // --- Part 1: Edge Panning & Cursor Change ---
            const panSpeed = 10;
            const edgeMargin = 50;
            let newCursor = 'default';

            if (event.clientX < edgeMargin) {
                this.viewport.x = Math.max(0, this.viewport.x - panSpeed);
                newCursor = 'w-resize';
            } else if (event.clientX > window.innerWidth - edgeMargin) {
                this.viewport.x = Math.min(this.WORLD_WIDTH - this.canvas.width, this.viewport.x + panSpeed);
                newCursor = 'e-resize';
            }

            if (event.clientY < edgeMargin) {
                this.viewport.y = Math.max(0, this.viewport.y - panSpeed);
                newCursor = newCursor === 'w-resize' ? 'nw-resize' : (newCursor === 'e-resize' ? 'ne-resize' : 'n-resize');
            } else if (event.clientY > window.innerHeight - edgeMargin) {
                this.viewport.y = Math.min(this.WORLD_HEIGHT - this.canvas.height, this.viewport.y + panSpeed);
                newCursor = newCursor === 'w-resize' ? 'sw-resize' : (newCursor === 'e-resize' ? 'se-resize' : 's-resize');
            }

            this.canvas.style.cursor = newCursor;

            // --- Part 2: Building Placement Cursor ---
            this.pendingBuildingCursorPosition = this.getMousePos(event);

            // --- Part 3: Delayed Hover Logic ---
            const mousePos = this.getMousePos(event);
            const objectUnderMouse = this.getObjectAt(mousePos.x, mousePos.y);

            const rect = this.canvas.getBoundingClientRect();
            const clientX = event.clientX;
            const clientY = event.clientY;

            if (objectUnderMouse) {
                console.log("Hover: Object detected:", objectUnderMouse.itemData.name);
            } else {
                console.log("Hover: No object detected.");
            }

            if (objectUnderMouse !== this.gameState.hoveredObject) {
                this.gameState.hoveredObject = objectUnderMouse;
                clearTimeout(this.gameState.hoverTimeoutId);

                if (objectUnderMouse) {
                    this.gameState.hoverTimeoutId = setTimeout(() => {
                        if (this.gameState.hoveredObject === objectUnderMouse) {
                            this.uiController.updateHoverPopup(objectUnderMouse, clientX, clientY);
                        }
                    }, 1000);
                } else {
                    this.uiController.updateHoverPopup(null, 0, 0);
                }
            }
        } catch (error) {
            console.error("An error occurred in onCanvasMouseMove:", error);
        }
    }

    onCanvasMouseLeave() {
        // This is crucial for stopping the timer and hiding the popup
        clearTimeout(this.gameState.hoverTimeoutId);
        this.gameState.hoveredObject = null;
        this.uiController.updateHoverPopup(null, 0, 0); 
        this.canvas.style.cursor = 'default';
    }

    // New function to correctly calculate mouse position relative to the scaled canvas
    getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top);
        
        return { x: mouseX + this.viewport.x, y: mouseY + this.viewport.y };
    }

    // Replace your existing getObjectAt function with this revised version
    getObjectAt(x, y) {
        // Loop through game objects in reverse order to check top-most objects first
        // (This is useful if you have a drawing order where units are drawn on top of buildings)
        const objectIds = Object.keys(this.gameState.gameObjects);
        for (let i = objectIds.length - 1; i >= 0; i--) {
            const obj = this.gameState.gameObjects[objectIds[i]];

            // Get the dimensions, prioritizing direct properties over itemData
            const objWidth = obj.width || (obj.itemData ? obj.itemData.width : 0);
            const objHeight = obj.height || (obj.itemData ? obj.itemData.height : 0);

            // If dimensions are not available, skip the object
            if (objWidth === 0 || objHeight === 0) continue;

            const objLeft = obj.x - objWidth / 2;
            const objRight = obj.x + objWidth / 2;
            const objTop = obj.y - obj.height / 2;
            const objBottom = obj.y + obj.height / 2;

            // Perform a simple rectangle-to-point collision check
            if (x >= objLeft && x <= objRight && y >= objTop && y <= objBottom) {
                // Found a match, return the object
                return obj;
            }
        }
        
        // No object was found at the given coordinates
        return null;
    }

    // New: Handle keyboard input for camera movement
    handleKeyboardInput() {
        const panSpeed = 10;
        if (this.keys['w'] || this.keys['ArrowUp']) {
            this.viewport.y = Math.max(0, this.viewport.y - panSpeed);
        }
        if (this.keys['s'] || this.keys['ArrowDown']) {
            this.viewport.y = Math.min(this.WORLD_HEIGHT - this.canvas.height, this.viewport.y + panSpeed);
        }
        if (this.keys['a'] || this.keys['ArrowLeft']) {
            this.viewport.x = Math.max(0, this.viewport.x - panSpeed);
        }
        if (this.keys['d'] || this.keys['ArrowRight']) {
            this.viewport.x = Math.min(this.WORLD_WIDTH - this.canvas.width, this.viewport.x + panSpeed);
        }

        // Focus HQ when 'h' is pressed ---
        if (this.keys['h']) {
            const hq = Object.values(this.gameState.gameObjects).find(obj =>
                obj.team === 'friend' && obj.itemData.type === 'Command'
            );
            
            if (hq) {
                // Calculate potential viewport coordinates to center on the HQ
                let newViewportX = hq.x - this.canvas.width / 2;
                let newViewportY = hq.y - this.canvas.height / 2;

                // Clamp the new coordinates to the world boundaries
                this.viewport.x = Math.max(0, Math.min(this.WORLD_WIDTH - this.canvas.width, newViewportX));
                this.viewport.y = Math.max(0, Math.min(this.WORLD_HEIGHT - this.canvas.height, newViewportY));

                this.uiController.setStatus("Camera moved to HQ.");
            }
        }


        if (this.keys['k']) {
            this.destroySelectedPlayerUnit();
        }
    }

    handleMouseDown(event) {
        if (event.button === 0) {
            this.onCanvasClick(event);
        }
    }
    
    // NEW: The main update loop for game logic.
    update(deltaTime) {
        // Update all game objects
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            // Pass deltaTime to the update method for consistent movement
            if (obj.update) {
                obj.update(deltaTime);
            }
        }
        
        // Handle resource updates separately
        this._updateResources();
    }

    /**
     * Updates the game's resources based on economic buildings.
     * This function now checks each economic building individually for its production timer.
     */
    _updateResources() {
        const currentTime = performance.now();
        let totalEnergyProduction = 0;
        let totalCreditsProduction = 0; // NEW: Track credits production
        
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            
            // Check for Energy Generators
            if (obj.itemData && obj.itemData.name === 'Energy Generator') {
                if (currentTime - obj.lastProductionTime >= 5000) {
                    totalEnergyProduction += 10;
                    obj.lastProductionTime = currentTime;
                }
            }

            // NEW: Check for Marketing Hubs
            if (obj.itemData && obj.itemData.name === 'Marketing Hub') {
                if (currentTime - obj.lastProductionTime >= 5000) {
                    totalCreditsProduction += 5; // Assuming 5 credits every 5 seconds
                    obj.lastProductionTime = currentTime;
                }
            }
        }
        
        // Update resources if there was any production
        if (totalEnergyProduction > 0) {
            this.gameState.resources.energy += totalEnergyProduction;
        }
        if (totalCreditsProduction > 0) {
            this.gameState.resources.credits += totalCreditsProduction;
        }
        
        // Always update the UI to reflect the latest resource values
        this.uiController.updateResourcesUI(this.gameState.resources);
    }

    /**
     * Destroys the currently selected player unit.
     */
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

    /**
     * Removes a game object from the game state.
     * @param {GameObject} objectToRemove The object to remove.
     */
    removeObject(objectToRemove) {
        if (objectToRemove && this.gameState.gameObjects[objectToRemove.id]) {
            delete this.gameState.gameObjects[objectToRemove.id];
            // Remove from selected units list if it's there
            this.gameState.selectedUnits = this.gameState.selectedUnits.filter(unit => unit.id !== objectToRemove.id);
            console.log(`Object with ID ${objectToRemove.id} removed from the game.`);
        }
    }

    // MAIN GAME PROCESS ///

    gameLoop(time) {
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.handleKeyboardInput();
        this.update(deltaTime); // Call the new update method
        
        // Removed the line that previously updated the UI every frame.
        // this.uiController.updateResourcesUI(this.gameState.resources);

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
            const isLocationClear = this._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight);
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
