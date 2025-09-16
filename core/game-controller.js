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

        this.uiController.gameController = this;
        this.uiController.initializeUI();
        
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
            const newBuilding = this.buildBuilding("friend", mouseX, mouseY);
            if (this.gameState.productionBuilding) {
                this.gameState.productionBuilding.deselect();
            }
            this.gameState.productionBuilding = newBuilding;
            this.gameState.productionBuilding.select();
            this.uiController.setStatus("Barracks placed.");
            this.gameState.pendingBuilding = null;
            return;
        }

        if (clickedObject && clickedObject.type === "ProductionBuilding") {
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

    getObjectAt(x, y) {
        // First, check if a production building's feature bar was clicked
        if (this.gameState.productionBuilding && this.gameState.productionBuilding.selected) {
            const rect = this.gameState.productionBuilding.featureBarRect;
            if (rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                return this.gameState.productionBuilding;
            }
        }
        
        // Then, check for any other game object
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