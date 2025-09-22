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

        // Event listeners for mouse interaction
        this.canvas.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        this.canvas.addEventListener('contextmenu', (event) => this.onCanvasRightClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.onCanvasMouseMove(event));
        this.canvas.addEventListener('mouseleave', () => this.onCanvasMouseLeave());

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
        this.viewport = {
            x: 0,
            y: 0
        };

        this.gameLoop();
    }

    // ========================= GAME MECHANISMS ========================= //
    buildBuilding(team, x, y, itemData) {
        const id = this.gameState.getNextId();
        let building;

        // Check the itemData type to create the correct building object.
        if (itemData.type === "Production") {
            building = new ProductionBuilding(id, team, x, y, this.canvas, this, itemData);
        } else if (itemData.type === "Command") {
            building = new CommandBuilding(id, team, x, y, this.canvas, this, itemData);
        } else if (itemData.type === "Economic") {
            // Instantiate an EconomicBuilding for economic types.
            building = new EconomicBuilding(id, team, x, y, this.canvas, this, itemData);
        } else {
            // Default to the specific OtherBuilding class for other types.
            building = new OtherBuilding(id, team, x, y, this.canvas, this, itemData);
        }
        
        // Set the initial production time for economic buildings.
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
    
    // 🛠️ Places the building at a location triggered by placement indicator. This is called from main.js to place the starting HQ.
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

    // Train a buiilding or unit in produce panel
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

            if (!this.isAffordable(itemToQueue.cost)) {
                this.uiController.setStatus(`Not enough resources to train ${itemToQueue.name}.`);
                return;
            }
            
            this.deductCost(itemToQueue.cost);

            this.gameState.productionBuilding.productionQueue.push({ item: itemToQueue, button: button });
            this.uiController.setStatus(`${itemToQueue.name} added to queue.`);
            return;
        }

        // ✅ check if it's a building
        if (buildings.some(b => b.name === item.name)) {
             if (!this.isAffordable(item.cost)) {
                this.uiController.setStatus(`Not enough resources to build ${item.name}.`);
                return;
            }

            this.gameState.pendingBuilding = item;
            this.uiController.setStatus(`Click on the map to place a ${item.name}.`);
            return;
        }

        // ❌ fallback
        this.uiController.setStatus("Unknown item type.");
    }

    // ========================= BUILDING PLACEMENT ========================= //

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

    // ========================= MOUSE AND KEYBOARD EVENTS ========================= //
    
    // Left mouse click operations: object click, map canvas click, placement indicator click
    onCanvasClick(event) {
        if (event.button !== 0) return;
        
        const mousePos = this.getMousePos(event);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;
        
        const clickedObject = this.getObjectAt(mouseX, mouseY);        
        
        if (this.gameState.pendingBuilding) {
            const { width: buildingWidth, height: buildingHeight , cost: buildingCost} = this.gameState.pendingBuilding;

            const isLocationClear = this._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight
            );
            
            // Correctly check if the building can be placed within the current viewport.
            const isWithinViewport = (
                mouseX - buildingWidth / 2 >= this.viewport.x &&
                mouseX + buildingWidth / 2 <= this.viewport.x + this.canvas.width &&
                mouseY - buildingHeight / 2 >= this.viewport.y &&
                mouseY + buildingHeight / 2 <= this.viewport.y + this.canvas.height
            );

            if (isLocationClear && isWithinViewport) {
                //deduct cost
                this.deductCost(buildingCost);

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

    // select a game object on map canvas
    _selectObject(object) {
        // Prevent selecting enemy objects
        if (object && object.team !== 'friend') {
            this.uiController.setStatus("You cannot select enemy units or buildings.");
            // Ensure nothing is selected
            this.gameState.selectedUnits = [];
            this.gameState.productionBuilding = null;
            return;
        }

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
                    if (!isSameProductionBuilding) {
                        this.gameState.productionBuilding = object;
                        this.gameState.productionBuilding.select();
                        this.uiController.setStatus(`${object.itemData.name} selected as primary.`);
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

    // Right mouse click operations: cancel placement indicator, deselect units, set rally point
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

        // This is the correct logical flow. Check if any units are selected first.
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

    // Key and cursor operations: Map canvas edge panning 
    onCanvasMouseMove(event) {
        try {
            // Edge Panning & Cursor Change ---
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

            // Building Placement Cursor ---
            this.pendingBuildingCursorPosition = this.getMousePos(event);

            // Delayed Hover Logic ---
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

    // Cursor leave operations: hide popup
    onCanvasMouseLeave() {
        // This is crucial for stopping the timer and hiding the popup
        clearTimeout(this.gameState.hoverTimeoutId);
        this.gameState.hoveredObject = null;
        this.uiController.updateHoverPopup(null, 0, 0); 
        this.canvas.style.cursor = 'default';
    }

    // Function to correctly calculate mouse position relative to the scaled canvas
    getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top);
        
        return { x: mouseX + this.viewport.x, y: mouseY + this.viewport.y };
    }

    // Replace your existing getObjectAt function with this revised version
    getObjectAt(x, y) {
        // Loop through game objects in reverse order to check top-most objects first (This is useful if you have a drawing order where units are drawn on top of buildings)
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

    // Handle keyboard input for camera movement
    handleKeyboardInput() {
        // Map canvas panning ----
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

        // Focus on next HQ when 't' key is pressed --- 
        if (this.keys['t']) {
            const hqs = Object.values(this.gameState.gameObjects).filter(obj => 
                obj.itemData && obj.itemData.type === 'Command'
            );


            if (hqs.length > 0) {
                let currentIndex = this.gameState.focusedHqIndex || 0;
                let nextIndex = (currentIndex + 1) % hqs.length;
                this.gameState.focusedHqIndex = nextIndex;

                const nextHq = hqs[nextIndex];
                this.focusCameraOnObject(nextHq);
                this.uiController.setStatus(`Camera moved to ${nextHq.team}'s HQ.`);
            }

            this.keys['t'] = false; // Reset the key state to prevent continuous jumping
        } 

        // Destroy action onunit
        if (this.keys['k']) {
            this.destroySelectedPlayerUnit();
        }
    }

    // ???
    handleMouseDown(event) {
        if (event.button === 0) {
            this.onCanvasClick(event);
        }
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

        const scaleX = miniMapCanvas.width / this.WORLD_WIDTH;
        const scaleY = miniMapCanvas.height / this.WORLD_HEIGHT;
        
        // Use a single scale factor to preserve aspect ratio
        const scale = Math.min(scaleX, scaleY);
        // Define a minimum size for indicators to ensure visibility
        const MIN_BUILDING_SIZE = 5;

        // Draw the viewport indicator using the uniform scale
        const indicatorX = this.viewport.x * scale;
        const indicatorY = this.viewport.y * scale;
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
                const miniMapX = obj.x * scale;
                const miniMapY = obj.y * scale;
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
    
    // The main update loop for game logic. Render resources and game objects
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
        console.log(`Viewport: x=${this.viewport.x}, y=${this.viewport.y}`);

        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.handleKeyboardInput();
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
