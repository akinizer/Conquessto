
import { Building } from './Building.js';
export class ProductionBuilding extends Building {
    constructor(id, team, x, y, canvas, gameManager) {
        super(id, team, x, y, canvas, gameManager);
        this.type = "ProductionBuilding";
        this.productionQueue = [];
        this.isProducing = false;
        this.productionTime = 100;
        this.productionTimer = 0;
        this.rallyPoint = { x: this.x + 80, y: this.y };
        this.isSelected = false;
        this.currentProductionItem = null;
    }

    select() {
        this.isSelected = true;
    }

    deselect() {
        this.isSelected = false;
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        const size = 40;
        ctx.fillStyle = this.team === "friend" ? "green" : "darkred";
        ctx.fillRect(this.x - size, this.y - size, size * 2, size * 2);
        
        if (this.isSelected) {
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - size, this.y - size, size * 2, size * 2);
        }

        if (this.team === "friend") {
            ctx.beginPath();
            ctx.arc(this.rallyPoint.x, this.rallyPoint.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "gold";
            ctx.fill();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = "gold";
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.rallyPoint.x, this.rallyPoint.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    update() {
        if (this.productionQueue.length > 0 && !this.isProducing) {
            this.isProducing = true;
            this.currentProductionItem = this.productionQueue[0];
            this.productionTimer = this.currentProductionItem.item.time;
            
            // <-- NEW: Calculate and set animation duration based on production time
            const durationInSeconds = this.productionTimer / 60; // Assuming 60 game ticks per second
            this.currentProductionItem.button.style.setProperty('--production-duration', `${durationInSeconds}s`);
            
            if (this.currentProductionItem.button) {
                this.currentProductionItem.button.classList.add('loading');
            }
        }
        if (this.isProducing) {
            this.productionTimer--;
            if (this.productionTimer <= 0) {
                const finishedItem = this.productionQueue.shift();
                if (finishedItem.item.type === "Unit") {
                    const newUnit = this.gameManager.spawnUnit(this.team, this.x, this.y);
                    newUnit.moveTo(this.rallyPoint.x, this.rallyPoint.y);
                }
                this.isProducing = false;
                if (finishedItem.button) {
                    finishedItem.button.classList.remove('loading');
                }
                this.currentProductionItem = null;
            }
        }
    }
}