// core/game-controller.js

import { GameState } from './game-state.js';
import { Unit } from '../game-objects/Unit.js';
import { ProductionBuilding } from '../game-objects/ProductionBuilding.js';
import { DataManager } from './data-manager.js';

export class GameController {
    constructor(canvas, uiController) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.uiController = uiController;
        this.gameState = new GameState();

        this.dataManager = new DataManager();
        this.dataManager.loadProductionData().then(() => {
            console.log('Game data is ready.');
        }).catch(error => {
            console.error('Failed to load game data:', error);
        });

        this.canvas.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        this.canvas.addEventListener('mouseup', (event) => this.handleMouseUp(event)); 
        this.canvas.addEventListener('contextmenu', (event) => this.onCanvasRightClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.onCanvasMouseMove(event));
        this.canvas.addEventListener('mouseleave', () => this.canvas.style.cursor = 'default');

        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('mousemove', (event) => this.handlePointerLockMove(event));
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        
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

        // Add event listeners for mouse movement
        this.gameLoop();
    }

    // MECHANISMS //

    buildBuilding(team, x, y, itemData) {
        const id = this.gameState.getNextId();
        const building = new ProductionBuilding(id, team, x, y, this.canvas, this, itemData);
        this.gameState.addObject(building);
        return building;
    }


    spawnUnit(team, x, y, width, height) {
        const id = this.gameState.getNextId();
        const unit = new Unit(id, team, x, y, width, height, this.canvas, this);
        this.gameState.addObject(unit);
        return unit;
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
            
            // Skip ignored object (the building itself) or non-solid objects
            if (otherObj === ignoreObject || !otherObj.tags.includes('solid')) {
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
        
        // Use the new getMousePos function
        const mousePos = this.getMousePos(event);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;
        
        const clickedObject = this.getObjectAt(mouseX, mouseY);
        
        if (this.gameState.pendingBuilding) {
            const { width: buildingWidth, height: buildingHeight } = this.gameState.pendingBuilding;

            const isLocationClear = this._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight);
            
            const isWithinCanvas = (
                mouseX - buildingWidth / 2 >= 0 &&
                mouseX + buildingWidth / 2 <= this.canvas.width &&
                mouseY - buildingHeight / 2 >= 0 &&
                mouseY + buildingHeight / 2 <= this.canvas.height
            );

            if (isLocationClear && isWithinCanvas) {
                const newBuilding = this.buildBuilding("friend", mouseX, mouseY, this.gameState.pendingBuilding);
                if (this.gameState.productionBuilding) {
                    this.gameState.productionBuilding.deselect();
                }
                this.gameState.productionBuilding = newBuilding;
                this.gameState.productionBuilding.select();
                this.uiController.setStatus(`${this.gameState.pendingBuilding.name} placed.`);
                this.gameState.pendingBuilding = null;
            } else {
                this.uiController.setStatus("Cannot place building here.");
            }
            return;
        }

        if (clickedObject && clickedObject.type === "ProductionBuilding") {
            this.gameState.selectedUnits.forEach(unit => unit.deselect());
            this.gameState.selectedUnits = [];
            
            if (this.gameState.productionBuilding) {
                this.gameState.productionBuilding.deselect();
            }
            this.gameState.productionBuilding = clickedObject;
            this.gameState.productionBuilding.select();
            this.uiController.setStatus(`${this.gameState.productionBuilding.name} ${this.gameState.productionBuilding.id} selected as primary.`);

            return;
        }

        if (clickedObject && clickedObject.type === "Unit") {
            this.gameState.selectedUnits.forEach(unit => unit.deselect());
            if (this.gameState.productionBuilding) {
                this.gameState.productionBuilding.deselect();
            }
            this.gameState.productionBuilding = null;
            this.gameState.selectedUnits = [clickedObject];
            clickedObject.select();
            this.uiController.setStatus(`Unit ${clickedObject.id} selected.`);
            return;
        }
        
        this.gameState.selectedUnits.forEach(unit => unit.deselect());
        if (this.gameState.productionBuilding) {
            this.gameState.productionBuilding.deselect();
        }
        this.gameState.selectedUnits = [];
        this.gameState.productionBuilding = null;
        this.uiController.setStatus("Ready.");
    }

    onCanvasRightClick(event) {
        event.preventDefault();
        if (event.button !== 2) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (mouseX < 0 || mouseX > this.canvas.width || mouseY < 0 || mouseY > this.canvas.height) {
            return;
        }
        
        if (this.gameState.pendingBuilding) {
            this.gameState.pendingBuilding = null;
            this.uiController.setStatus("Building placement cancelled.");
            return;
        }

        if (this.gameState.selectedUnits.length > 0) {
            this.gameState.selectedUnits.forEach(unit => {
                unit.moveTo(mouseX, mouseY);
            });
            this.uiController.setStatus("Unit(s) moving.");
            return;
        }

        if (this.gameState.productionBuilding) {
            this.gameState.productionBuilding.rallyPoint.x = mouseX;
            this.gameState.productionBuilding.rallyPoint.y = mouseY;
            this.uiController.setStatus("Rally point set.");
        }
    }

    onCanvasMouseMove(event) {
        if (document.pointerLockElement === this.canvas) { return; }

        const mousePos = this.getMousePos(event);
        this.pendingBuildingCursorPosition = mousePos;
    }

    onPointerLockChange() {
        if (document.pointerLockElement === this.canvas) { console.log('The pointer is locked.'); } 
        else { console.log('The pointer is unlocked.'); }
    }

    // New function to correctly calculate mouse position relative to the scaled canvas
     getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        // Get the mouse position relative to the canvas
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top);
        
        // Return the world coordinates, which include the viewport offset
        return { x: mouseX + this.viewport.x, y: mouseY + this.viewport.y };
    }

    getObjectAt(x, y) {
        if (this.gameState.productionBuilding && this.gameState.productionBuilding.selected) {
            const rect = this.gameState.productionBuilding.featureBarRect;
            if (rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                return this.gameState.productionBuilding;
            }
        }
        
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            const distance = Math.sqrt(Math.pow(obj.x - x, 2) + Math.pow(obj.y - y, 2));
            const hitRadius = (obj.type === "Unit") ? 15 : 40;
            if (distance < hitRadius) {
                return obj;
            }
        }
        return null;
    }

    handleMouseMove(event) {
        const panSpeed = 10;
        const edgeMargin = 50;
        let newCursor = 'default';

        // Check for edge panning and set the cursor
        if (event.clientX < edgeMargin && event.clientY < edgeMargin) {
            this.viewport.x = Math.max(0, this.viewport.x - panSpeed);
            this.viewport.y = Math.max(0, this.viewport.y - panSpeed);
            newCursor = 'nw-resize';
        } else if (event.clientX > window.innerWidth - edgeMargin && event.clientY < edgeMargin) {
            this.viewport.x = Math.min(this.WORLD_WIDTH - this.canvas.width, this.viewport.x + panSpeed);
            this.viewport.y = Math.max(0, this.viewport.y - panSpeed);
            newCursor = 'ne-resize';
        } else if (event.clientX > window.innerWidth - edgeMargin && event.clientY > window.innerHeight - edgeMargin) {
            this.viewport.x = Math.min(this.WORLD_WIDTH - this.canvas.width, this.viewport.x + panSpeed);
            this.viewport.y = Math.min(this.WORLD_HEIGHT - this.canvas.height, this.viewport.y + panSpeed);
            newCursor = 'se-resize';
        } else if (event.clientX < edgeMargin && event.clientY > window.innerHeight - edgeMargin) {
            this.viewport.x = Math.max(0, this.viewport.x - panSpeed);
            this.viewport.y = Math.min(this.WORLD_HEIGHT - this.canvas.height, this.viewport.y + panSpeed);
            newCursor = 'sw-resize';
        } else if (event.clientX < edgeMargin) {
            this.viewport.x = Math.max(0, this.viewport.x - panSpeed);
            newCursor = 'w-resize';
        } else if (event.clientX > window.innerWidth - edgeMargin) {
            this.viewport.x = Math.min(this.WORLD_WIDTH - this.canvas.width, this.viewport.x + panSpeed);
            newCursor = 'e-resize';
        } else if (event.clientY < edgeMargin) {
            this.viewport.y = Math.max(0, this.viewport.y - panSpeed);
            newCursor = 'n-resize';
        } else if (event.clientY > window.innerHeight - edgeMargin) {
            this.viewport.y = Math.min(this.WORLD_HEIGHT - this.canvas.height, this.viewport.y + panSpeed);
            newCursor = 's-resize';
        }

        this.canvas.style.cursor = newCursor;

    }

    handlePointerLockMove(event) {
        if (document.pointerLockElement !== this.canvas) {
            return;
        }

        const panSpeed = 1.5;
        this.viewport.x += event.movementX * panSpeed;
        this.viewport.y += event.movementY * panSpeed;

        // Add boundary checks
        this.viewport.x = Math.max(0, Math.min(this.WORLD_WIDTH - this.canvas.width, this.viewport.x));
        this.viewport.y = Math.max(0, Math.min(this.WORLD_HEIGHT - this.canvas.height, this.viewport.y));
    }

    handleMouseDown(event) {
        // Left click for selecting/placing buildings
        if (event.button === 0) {
            this.onCanvasClick(event);
        }
        // Middle click to toggle pointer lock for panning
        else if (event.button === 1) {
            event.preventDefault(); // Prevents default browser behavior like auto-scroll
            this.canvas.requestPointerLock();
        }
    }

    handleMouseUp(event) {
        // Exit pointer lock when middle button is released
        if (event.button === 1) {
            document.exitPointerLock(); // <-- ADD THIS METHOD
        }
    }

    // MAIN GAME PROCESS ///

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply translation to the canvas context
        this.ctx.save();
        this.ctx.translate(-this.viewport.x, -this.viewport.y);

        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            if (obj.update) obj.update();
            if (obj.draw) obj.draw();
        }

        this.ctx.restore();

        if (this.gameState.pendingBuilding) {
            // ✅ Get the specific width and height for the building being placed
            const { width: buildingWidth, height: buildingHeight } = this.gameState.pendingBuilding;

            const mouseX = this.pendingBuildingCursorPosition.x;
            const mouseY = this.pendingBuildingCursorPosition.y;

            const isWithinCanvas = (
                mouseX - buildingWidth / 2 >= 0 &&
                mouseX + buildingWidth / 2 <= this.canvas.width &&
                mouseY - buildingHeight / 2 >= 0 &&
                mouseY + buildingHeight / 2 <= this.canvas.height
            );

            const isLocationClear = this._isAreaClear(
                mouseX,
                mouseY,
                buildingWidth,
                buildingHeight
            );

            this.canPlaceBuilding = isWithinCanvas && isLocationClear;
            const silhouetteColor = this.canPlaceBuilding ? 'rgba(0,255,0,0.4)' : 'rgba(255,0,0,0.4)';

            // 🟩 Draw the silhouette using the correct dimensions
            this.ctx.fillStyle = silhouetteColor;
            this.ctx.fillRect(
                mouseX - buildingWidth / 2,
                mouseY - buildingHeight / 2,
                buildingWidth,
                buildingHeight
            );
        }

        const livingObjects = {};
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            if (obj.health > 0) {
                livingObjects[id] = obj;
            }
        }
        this.gameState.gameObjects = livingObjects;

        requestAnimationFrame(() => this.gameLoop());
    }
}