// game-objects/ProductionBuilding.js
import { Building } from './Building.js'; // You need to import the parent class
export class ProductionBuilding extends Building {
    constructor(id, team, x, y, canvas, gameController) {
        // Pass common properties to the parent Building class
        super(id, team, x, y, canvas, gameController, ['solid', 'structure']);

        this.type = "ProductionBuilding";
        this.productionQueue = [];
        this.productionTime = 0;
        this.rallyPoint = { x: this.x, y: this.y + this.height / 2 + 10 };
        this.featureBarRect = null;
    }

    select() {
        this.selected = true;
    }

    deselect() {
        this.selected = false;
    }
    
   _getClosestPointOnPerimeter(targetX, targetY, unitWidth, unitHeight) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const padding = Math.max(unitWidth, unitHeight) / 2 + 5;
        
        // Find the closest point on the rectangle (including corners) to the rally point
        const closestX = Math.max(this.x - halfWidth, Math.min(targetX, this.x + halfWidth));
        const closestY = Math.max(this.y - halfHeight, Math.min(targetY, this.y + halfHeight));

        let normalX = targetX - closestX;
        let normalY = targetY - closestY;

        // Handle the edge case where the rally point is exactly on the perimeter
        if (normalX === 0 && normalY === 0) {
            // If it's on the edge, push it out from the center
            normalX = targetX - this.x;
            normalY = targetY - this.y;
        }
        
        const distance = Math.sqrt(normalX * normalX + normalY * normalY);
        
        if (distance === 0) {
            // If rally point is at the center, default to spawning on the right side
            normalX = 1;
            normalY = 0;
        } else {
            // Normalize the vector
            normalX /= distance;
            normalY /= distance;
        }
        
        // Calculate the final spawn point by projecting outward from the closest point
        const spawnX = closestX + normalX * padding;
        const spawnY = closestY + normalY * padding;
        
        return { x: spawnX, y: spawnY };
    }

    
    drawSilhouette(color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    draw() {
        // Draw the building itself
        this.ctx.fillStyle = this.team === "friend" ? '#555555' : '#882222';
        this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

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
            const unitWidth = this.productionQueue[0]?.item?.width || 30;
            const unitHeight = this.productionQueue[0]?.item?.height || 30;

            const spawnPoint = this._getClosestPointOnPerimeter(this.rallyPoint.x, this.rallyPoint.y, unitWidth, unitHeight);
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
        // Case 1: The production queue is unexpectedly empty
        if (this.productionQueue.length === 0) {
            return; // Nothing to do
        }
        
        const itemToProduce = this.productionQueue[0];
        
        // Case 2: The item in the queue is missing required data
        if (!itemToProduce || !itemToProduce.item || !itemToProduce.item.width || !itemToProduce.item.height) {
            console.error("Error: Item in production queue is malformed or missing dimensions.");
            return;
        }
        
        const unitWidth = itemToProduce.item.width;
        const unitHeight = itemToProduce.item.height;
        
        // Case 3: The rally point is not set
        if (!this.rallyPoint || typeof this.rallyPoint.x === 'undefined') {
            console.error("Error: Rally point is not set for the building.");
            return;
        }

        const spawnPoint = this._getClosestPointOnPerimeter(this.rallyPoint.x, this.rallyPoint.y, unitWidth, unitHeight);

        if (this.gameController.isLocationClear(spawnPoint.x, spawnPoint.y, { width: unitWidth, height: unitHeight }, this)) {
            this.productionTime++;
            if (this.productionTime >= itemToProduce.item.time) {
                
                // Log successful spawn
                console.log("Unit spawned successfully!");
                const newUnit = this.gameController.spawnUnit(this.team, spawnPoint.x, spawnPoint.y);
                newUnit.moveTo(this.rallyPoint.x, this.rallyPoint.y);
                
                this.productionQueue.shift();
                this.productionTime = 0;
            }
        } else {
            // Case 4: The most common failure point - the location is blocked
            console.error("Spawn location blocked. Production timer reset.");
            this.productionTime = 0;
        }
    }
}