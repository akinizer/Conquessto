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

        this.canvas.addEventListener('mousedown', (event) => this.onCanvasClick(event));
        this.canvas.addEventListener('contextmenu', (event) => this.onCanvasRightClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.onCanvasMouseMove(event));

        this.uiController.gameController = this;
        this.uiController.initializeUI();
        
        this.pendingBuildingCursorPosition = { x: 0, y: 0 };
        this.canPlaceBuilding = true;

        this.gameLoop();
    }

    buildBuilding(team, x, y) {
        const id = this.gameState.getNextId();
        const building = new ProductionBuilding(id, team, x, y, this.canvas, this);
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
        if (item.type === "Unit") {
            if (!this.gameState.productionBuilding) {
                this.uiController.setStatus("Select a barracks to train units!");
                return;
            }

            // 🔑 Get the full production data from the DataManager
            const productionData = this.dataManager.getProductionItems();
            
            // 🔑 Find the specific unit in the loaded data using its name
            const itemToQueue = productionData.units.find(unit => unit.name === item.name);
            
            if (!itemToQueue) {
                console.error(`Error: Unit "${item.name}" not found in production data.`);
                this.uiController.setStatus("Invalid unit type.");
                return;
            }
            
            // Push the fully populated item with dimensions to the queue
            this.gameState.productionBuilding.productionQueue.push({ item: itemToQueue, button: button });
            this.uiController.setStatus(`${itemToQueue.name} added to queue.`);
        } else if (item.type === "Building") {
            this.gameState.pendingBuilding = item;
            this.uiController.setStatus(`Click on the map to place a ${item.name}.`);
        }
    }

    _isAreaClear(x, y, width, height, ignoreObject = null) {
        const padding = 10;
        const paddedWidth = width + padding * 2;
        const paddedHeight = height + padding * 2;
        
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            if (obj === ignoreObject) continue;

            if (obj.type === "Unit") {
                const unitRadius = 15;
                const closestX = Math.max(obj.x - unitRadius, Math.min(x, obj.x + unitRadius));
                const closestY = Math.max(obj.y - unitRadius, Math.min(y, obj.y + unitRadius));
                
                const distance = Math.sqrt(Math.pow(closestX - x, 2) + Math.pow(closestY - y, 2));

                if (distance < unitRadius + Math.min(paddedWidth, paddedHeight) / 2) {
                    return false;
                }
            } else {
                const objLeft = obj.x - obj.width / 2;
                const objRight = obj.x + obj.width / 2;
                const objTop = obj.y - obj.height / 2;
                const objBottom = obj.y + obj.height / 2;
                
                const newObjLeft = x - paddedWidth / 2;
                const newObjRight = x + paddedWidth / 2;
                const newObjTop = y - paddedHeight / 2;
                const newObjBottom = y + paddedHeight / 2;
    
                if (newObjRight > objLeft && newObjLeft < objRight && newObjBottom > objTop && newObjTop < objBottom) {
                    return false;
                }
            }
        }
        return true;
    }

    isLocationClearForUnit(x, y, ignoreObject = null) {
        const unitWidth = 30;
        const unitHeight = 30;
        return this._isAreaClear(x, y, unitWidth, unitHeight, ignoreObject);
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
    
    onCanvasClick(event) {
        if (event.button !== 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const clickedObject = this.getObjectAt(mouseX, mouseY);
        
        if (this.gameState.pendingBuilding) {
            const buildingWidth = 80;
            const buildingHeight = 80;
            
            const isLocationClear = this._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight);
            
            const isWithinCanvas = (
                mouseX - buildingWidth / 2 >= 0 &&
                mouseX + buildingWidth / 2 <= this.canvas.width &&
                mouseY - buildingHeight / 2 >= 0 &&
                mouseY + buildingHeight / 2 <= this.canvas.height
            );

            if (isLocationClear && isWithinCanvas) {
                const newBuilding = this.buildBuilding("friend", mouseX, mouseY);
                if (this.gameState.productionBuilding) {
                    this.gameState.productionBuilding.deselect();
                }
                this.gameState.productionBuilding = newBuilding;
                this.gameState.productionBuilding.select();
                this.uiController.setStatus("Barracks placed.");
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
            this.uiController.setStatus(`Barracks ${this.gameState.productionBuilding.id} selected as primary.`);
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
        const rect = this.canvas.getBoundingClientRect();
        this.pendingBuildingCursorPosition.x = event.clientX - rect.left;
        this.pendingBuildingCursorPosition.y = event.clientY - rect.top;
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

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            if (obj.update) obj.update();
            if (obj.draw) obj.draw();
        }

        if (this.gameState.pendingBuilding) {
            const buildingWidth = 80;
            const buildingHeight = 80;

            const isWithinCanvas = (
                this.pendingBuildingCursorPosition.x - buildingWidth / 2 >= 0 &&
                this.pendingBuildingCursorPosition.x + buildingWidth / 2 <= this.canvas.width &&
                this.pendingBuildingCursorPosition.y - buildingHeight / 2 >= 0 &&
                this.pendingBuildingCursorPosition.y + buildingHeight / 2 <= this.canvas.height
            );

            const isLocationClear = this._isAreaClear(
                this.pendingBuildingCursorPosition.x,
                this.pendingBuildingCursorPosition.y,
                buildingWidth,
                buildingHeight
            );
            this.canPlaceBuilding = isWithinCanvas && isLocationClear;
            
            const silhouetteColor = this.canPlaceBuilding ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            const pendingBuilding = new ProductionBuilding(null, null, this.pendingBuildingCursorPosition.x, this.pendingBuildingCursorPosition.y, this.canvas, this);
            pendingBuilding.drawSilhouette(silhouetteColor);
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