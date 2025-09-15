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

        this.canvas.addEventListener('mousedown', (event) => this.onCanvasClick(event));
        
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
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const clickedObject = this.getObjectAt(mouseX, mouseY);

        console.log("Clicked Object:", clickedObject); // <-- ADD THIS LINE

        // If we are in building placement mode, place the building.
        if (this.pendingBuilding) {
            const newBuilding = this.buildBuilding("friend", mouseX, mouseY);
            // Automatically make the first building the primary one
            if (!this.productionBuilding) {
                this.productionBuilding = newBuilding;
                this.productionBuilding.select();
                document.getElementById('panel-status').textContent = "Barracks placed. This is your primary barracks.";
            } else {
                document.getElementById('panel-status').textContent = "Barracks placed. Click it to make it your primary.";
            }
            this.pendingBuilding = null;
            return;
        }

        // Only change the primary building if a different one is clicked
        if (clickedObject && clickedObject.type === "ProductionBuilding" && clickedObject !== this.productionBuilding) {
            // Deselect the old one if it exists
            if (this.productionBuilding) {
                this.productionBuilding.deselect();
            }
            // Set the new one as primary and select it
            this.productionBuilding = clickedObject;
            this.productionBuilding.select();
            document.getElementById('panel-status').textContent = `Barracks ${this.productionBuilding.id} selected as primary.`;
        }
    }

    getObjectAt(x, y) {
        // Iterate through all game objects to find the one that was clicked
        for (const id in this.gameObjects) {
            const obj = this.gameObjects[id];
            // Calculate the bounding box for buildings and check for a collision
            const objWidth = 80; // Assuming size is 40 * 2 from game-objects.js draw()
            const objHeight = 80;
            if (x >= obj.x - objWidth / 2 && x <= obj.x + objWidth / 2 &&
                y >= obj.y - objHeight / 2 && y <= obj.y + objHeight / 2) {
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