// core/game-controller.js

import { GameState } from './game-state.js';
import { Unit } from '../game-objects/Unit.js';
import { ProductionBuilding } from '../game-objects/ProductionBuilding.js';

export class GameController {
    constructor(canvas, uiController) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.uiController = uiController;
        this.gameState = new GameState();

        this.canvas.addEventListener('mousedown', (event) => this.onCanvasClick(event));
        this.canvas.addEventListener('contextmenu', (event) => this.onCanvasRightClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.onCanvasMouseMove(event)); // New listener deployed

        this.uiController.gameController = this;
        this.uiController.initializeUI();
        
        this.pendingBuildingCursorPosition = { x: 0, y: 0 }; // New state property
        this.canPlaceBuilding = true; // New state property

        this.gameLoop();
    }

    buildBuilding(team, x, y) {
        const id = this.gameState.getNextId();
        const building = new ProductionBuilding(id, team, x, y, this.canvas, this);
        this.gameState.addObject(building);
        return building;
    }

    spawnUnit(team, x, y) {
        const id = this.gameState.getNextId();
        const unit = new Unit(id, team, x, y, this.canvas, this);
        this.gameState.addObject(unit);
        return unit;
    }

    trainItem(item, button) {
        if (item.type === "Unit") {
            if (!this.gameState.productionBuilding) {
                this.uiController.setStatus("Select a barracks to train units!");
                return;
            }
            this.gameState.productionBuilding.productionQueue.push({ item: item, button: button });
            this.uiController.setStatus(`${item.name} added to queue.`);
        } else if (item.type === "Building") {
            this.gameState.pendingBuilding = item;
            this.uiController.setStatus(`Click on the map to place a ${item.name}.`);
        }
    }

    onCanvasClick(event) {
        if (event.button !== 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const clickedObject = this.getObjectAt(mouseX, mouseY);
        
        if (this.gameState.pendingBuilding) {
            // New check: only place if the location is valid
            if (this.canPlaceBuilding) {
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
        
        // Protocol: Cancel pending building with right-click
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

        // Determine if the building can be placed
        this.canPlaceBuilding = (this.pendingBuildingCursorPosition.x >= 0 && this.pendingBuildingCursorPosition.x <= this.canvas.width &&
                               this.pendingBuildingCursorPosition.y >= 0 && this.pendingBuildingCursorPosition.y <= this.canvas.height);
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

        // Render the pending building silhouette
        if (this.gameState.pendingBuilding) {
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