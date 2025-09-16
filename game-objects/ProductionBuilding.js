// game-objects/ProductionBuilding.js

export class ProductionBuilding {
    constructor(id, team, x, y, canvas, gameController) {
        this.id = id;
        this.team = team;
        this.x = x;
        this.y = y;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 80;
        this.height = 80;
        this.selected = false;
        this.gameController = gameController;
        this.type = "ProductionBuilding";
        this.productionQueue = [];
        this.productionTime = 0;
        this.rallyPoint = { x: x, y: y };
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.featureBarRect = null; // New property to store bar dimensions
    }

    select() {
        this.selected = true;
    }

    deselect() {
        this.selected = false;
    }

    draw() {
        // Draw the building itself
        this.ctx.fillStyle = this.team === "friend" ? '#555555' : '#882222';
        this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // All of the following visuals only appear if the building is selected.
        if (this.selected) {
            // Draw a green outline
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            
            // Draw the features bar
            const barWidth = 80;
            const barHeight = 20;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.height / 2 - 30;

            this.ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Store the dimensions of the features bar
            this.featureBarRect = {
                x: barX,
                y: barY,
                width: barWidth,
                height: barHeight
            };

            // Draw feature slots
            const slotSize = 15;
            const slotPadding = (barWidth - (slotSize * 4)) / 5;

            for (let i = 0; i < 4; i++) {
                this.ctx.fillStyle = '#555';
                const slotX = barX + slotPadding + (i * (slotSize + slotPadding));
                const slotY = barY + (barHeight - slotSize) / 2;
                this.ctx.fillRect(slotX, slotY, slotSize, slotSize);
            }

            // Draw rally point line
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.x, this.y);
            this.ctx.lineTo(this.rallyPoint.x, this.rallyPoint.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    update() {
        if (this.productionQueue.length > 0) {
            this.productionTime++;
            const itemToProduce = this.productionQueue[0];
            if (this.productionTime >= itemToProduce.item.time) {
                const newUnit = this.gameController.spawnUnit(this.team, this.x, this.y);
                newUnit.moveTo(this.rallyPoint.x, this.rallyPoint.y);
                this.productionQueue.shift();
                this.productionTime = 0;
            }
        }
    }
}