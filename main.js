// main.js

import { Unit, ProductionBuilding, Building } from './game-objects.js';
import { initializeUI, renderProductionButtons, clearProductionPanel } from './ui.js';

const PRODUCTION_ITEMS = {
    "units": [
        { name: "Infantry", type: "Unit", cost: 50, time: 200, icon: "" }
    ],
    "buildings": [
        { name: "Barracks", type: "Building", cost: 200, time: 500, icon: "" }
    ]
};

class RTSManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameObjects = {};
        this.nextObjectId = 0;
        this.pendingBuilding = null;
        this.productionBuilding = null;
        this.selectedUnits = []; 

        this.canvas.addEventListener('mousedown', (event) => this.onCanvasClick(event));
        this.canvas.addEventListener('contextmenu', (event) => this.onCanvasRightClick(event)); 
        
        initializeUI(this, PRODUCTION_ITEMS);
        this.gameLoop();
    }

    getNextId() {
        this.nextObjectId++;
        return this.nextObjectId;
    }

    buildBuilding(team, x, y, isProduction = true) {
        const id = this.getNextId();
        const building = new ProductionBuilding(id, team, x, y, this.canvas, this);
        this.gameObjects[id] = building;
        return building;
    }

    spawnUnit(team, x, y) {
        const id = this.getNextId();
        const unit = new Unit(id, team, x, y, this.canvas, this);
        this.gameObjects[id] = unit;
        return unit;
    }

    trainItem(item) {
        if (item.type === "Unit") {
            if (!this.productionBuilding) {
                document.getElementById('panel-status').textContent = "Select a barracks to train units!";
                return;
            }
            this.productionBuilding.productionQueue.push(item);
            document.getElementById('panel-status').textContent = `Infantry added to queue.`;
        } else if (item.type === "Building") {
            this.pendingBuilding = item;
            document.getElementById('panel-status').textContent = `Click on the map to place a ${item.name}.`;
        }
    }

    onCanvasClick(event) {
        if (event.button !== 0) return; // <-- NEW: Only respond to left-clicks

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const clickedObject = this.getObjectAt(mouseX, mouseY);

        if (this.pendingBuilding) {
            const newBuilding = this.buildBuilding("friend", mouseX, mouseY);
            if (!this.productionBuilding) {
                this.productionBuilding = newBuilding;
                this.productionBuilding.select();
                document.getElementById('panel-status').textContent = "Barracks placed. This is your primary barracks.";
            } else {
                this.productionBuilding.deselect();
                this.productionBuilding = newBuilding;
                this.productionBuilding.select();
                document.getElementById('panel-status').textContent = "Barracks placed. Click it to make it your primary.";
            }
            this.pendingBuilding = null;
            return;
        }

        if (clickedObject && clickedObject.type === "ProductionBuilding") {
            if (this.productionBuilding) {
                this.productionBuilding.deselect();
            }
            this.productionBuilding = clickedObject;
            this.productionBuilding.select();
            document.getElementById('panel-status').textContent = `Barracks ${this.productionBuilding.id} selected as primary.`;
            return;
        }

        if (clickedObject && clickedObject.type === "Unit") {
            this.selectedUnits.forEach(unit => unit.deselect());
            this.selectedUnits = [clickedObject];
            clickedObject.select();
            document.getElementById('panel-status').textContent = `Unit ${clickedObject.id} selected.`;
        }
    }

    onCanvasRightClick(event) {
        event.preventDefault();
        if (event.button !== 2) return; // <-- NEW: Only respond to right-clicks

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (this.selectedUnits.length > 0) {
            this.selectedUnits.forEach(unit => {
                unit.moveTo(mouseX, mouseY);
            });
            document.getElementById('panel-status').textContent = "Unit(s) moving.";
            return;
        }

        if (this.productionBuilding) {
            this.productionBuilding.rallyPoint.x = mouseX;
            this.productionBuilding.rallyPoint.y = mouseY;
            document.getElementById('panel-status').textContent = "Rally point set.";
        }
    }

    getObjectAt(x, y) {
        for (const id in this.gameObjects) {
            const obj = this.gameObjects[id];
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
        
        for (const id in this.gameObjects) {
            const obj = this.gameObjects[id];
            if (obj.update) obj.update();
            if (obj.draw) obj.draw();
        }
        
        const livingObjects = {};
        for (const id in this.gameObjects) {
            const obj = this.gameObjects[id];
            if (obj.health > 0) {
                livingObjects[id] = obj;
            }
        }
        this.gameObjects = livingObjects;
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

let gameManager;
window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    gameManager = new RTSManager(canvas);
};