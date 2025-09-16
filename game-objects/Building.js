import { GameObject } from './GameObject.js';
 
export class Building extends GameObject {
    constructor(id, team, x, y, canvas, gameManager) {
        super(id, "Building", team, x, y, canvas, gameManager);
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        const size = 40;
        ctx.fillStyle = this.team === "friend" ? "green" : "darkred";
        ctx.fillRect(this.x - size, this.y - size, size * 2, size * 2);
    }
}