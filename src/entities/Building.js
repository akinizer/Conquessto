// game-objects/Building.js

import { GameObject } from './GameObject.js';

export class Building extends GameObject {
    // 1. Add itemData to the constructor parameters
    constructor(id, team, x, y, canvas, gameController, tags = [], itemData) {
        super(id, "Building", team, x, y, canvas, gameController, tags);
        
        // 2. This is the crucial line: store the data on the object
        this.itemData = itemData;

        // 3. Use itemData to set properties dynamically
        this.width = this.itemData.width || 80;
        this.height = this.itemData.height || 80;
        this.health = this.itemData.health || 1000;
        this.maxHealth = this.itemData.health || 1000;

        // 🚨 4. ADD PERSISTENT PRODUCTION STATE HERE 🚨
        this.isLocallyProducing = false;      // Flag: Is production currently running?
        this.localCountdownEnd = 0;           // Time (Date.now() value) when production finishes
        this.producingItemName = null;        // Stores the name of the item being built

        this.ctx = canvas.getContext('2d'); 
    }
    
    select() {
        this.selected = true;
    }
    
    deselect() {
        this.selected = false;
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        const size = 40;
        ctx.fillStyle = this.team === "friend" ? "green" : "darkred";
        ctx.fillRect(this.x - size, this.y - size, size * 2, size * 2);
    }

    update(deltaTime) {}
}