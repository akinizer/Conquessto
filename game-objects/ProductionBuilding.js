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
        this.featureBarRect = null;
    }

    select() {
        this.selected = true;
    }

    deselect() {
        this.selected = false;
    }
    
    // New helper method to get the closest point on the building's perimeter
    _getClosestPointOnPerimeter(targetX, targetY) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const top = { x: this.x, y: this.y - halfHeight };
        const bottom = { x: this.x, y: this.y + halfHeight };
        const left = { x: this.x - halfWidth, y: this.y };
        const right = { x: this.x + halfWidth, y: this.y };

        const distances = {
            top: Math.sqrt(Math.pow(top.x - targetX, 2) + Math.pow(top.y - targetY, 2)),
            bottom: Math.sqrt(Math.pow(bottom.x - targetX, 2) + Math.pow(bottom.y - targetY, 2)),
            left: Math.sqrt(Math.pow(left.x - targetX, 2) + Math.pow(left.y - targetY, 2)),
            right: Math.sqrt(Math.pow(right.x - targetX, 2) + Math.pow(right.y - targetY, 2))
        };
        
        const minDistance = Math.min(...Object.values(distances));
        
        switch(minDistance) {
            case distances.top:
                return { x: this.x, y: this.y - halfHeight, side: 'top' };
            case distances.bottom:
                return { x: this.x, y: this.y + halfHeight, side: 'bottom' };
            case distances.left:
                return { x: this.x - halfWidth, y: this.y, side: 'left' };
            case distances.right:
                return { x: this.x + halfWidth, y: this.y, side: 'right' };
            default:
                return { x: this.x, y: this.y }; // Fallback
        }
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
            
            // Draw the dynamic spawn exit point
            const spawnPoint = this._getClosestPointOnPerimeter(this.rallyPoint.x, this.rallyPoint.y);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(spawnPoint.x, spawnPoint.y, 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw rally point line
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(spawnPoint.x, spawnPoint.y);
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
                // Get the dynamic spawn point
                const spawnPoint = this._getClosestPointOnPerimeter(this.rallyPoint.x, this.rallyPoint.y);
                const newUnit = this.gameController.spawnUnit(this.team, spawnPoint.x, spawnPoint.y);
                newUnit.moveTo(this.rallyPoint.x, this.rallyPoint.y);
                this.productionQueue.shift();
                this.productionTime = 0;
            }
        }
    }
}