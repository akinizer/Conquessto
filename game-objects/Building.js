// game-objects/Building.js

import { GameObject } from './GameObject.js';

export class Building extends GameObject {
    constructor(id, team, x, y, canvas, gameController, tags = []) {
        // We call super() with the 'Building' type and the tags
        super(id, "Building", team, x, y, canvas, gameController, tags);
        this.width = 80;
        this.height = 80;
        this.health = 1000;
        this.maxHealth = 1000;
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
}