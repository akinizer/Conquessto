import { GameObject } from './GameObject.js';

export class Unit extends GameObject {
    constructor(id, team, x, y, width, height, canvas, gameController, itemData, tags = []) {
        super(id, "Unit", team, x, y, canvas, gameController, tags);

        this.width = width;
        this.height = height;
        this.itemData = itemData;

        this.targetX = x;
        this.targetY = y;
        this.speed = 2;
        this.attackRange = 40; // The range to stop and deal damage
        this.autochaseRange = 200; // The range to start moving toward an enemy
        this.damage = 0.5;
        this.attackTarget = null;
        this.isSelected = false;
        this.isCommandedToMove = false;
        this.isCommandedToHQ = false; // New state to check if unit is commanded to an HQ
        this.gameController = gameController;
        this.tags = tags;
        
        this.path = [];
        this.pathIndex = 0;
    }

    select = () => {
        this.isSelected = true;
    }

    deselect = () => {
        this.isSelected = false;
    }
    
    draw = () => {
        const ctx = this.canvas.getContext('2d');
        const color = this.team === "friend" ? "blue" : "red";

        // Save the current state of the canvas for isolation
        ctx.save();
        
        // Translate the canvas context to the unit's position
        ctx.translate(this.x, this.y);

        // Draw autochase range indicator if the unit is selected
        if (this.isSelected) {
            ctx.beginPath();
            ctx.arc(0, 0, this.autochaseRange, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 0, 0.1)"; // Semi-transparent yellow
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw the unit shape based on its type
        switch (this.itemData.type) {
            case "Infantry":
                this._drawCircle(ctx, color);
                break;
            case "Offensive Vehicle":
            case "Transport Vehicle":
            case "Support Vehicle":
            case "Entrench Vehicle":
                this._drawSquare(ctx, color);
                break;
            case "Aircraft":
                this._drawTriangle(ctx, color);
                break;
            case "Naval":
                this._drawHexagon(ctx, color);
                break;
            case "Amphibious Vehicle":
                this._drawDiamond(ctx, color);
                break;
            default:
                this._drawSquare(ctx, color);
                break;
        }

        // Draw selection highlight only if the unit is selected
        if (this.isSelected) {
            // The stroke is applied to the last shape drawn (the unit itself)
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Restore the canvas state to its original position
        ctx.restore();

        // Draw health bar (remains positioned relative to this.x, this.y)
        const barWidth = 30;
        const barHeight = 5;
        ctx.fillStyle = "#555";
        ctx.fillRect(this.x - barWidth / 2, this.y - 25, barWidth, barHeight);
        ctx.fillStyle = "green";
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillRect(this.x - barWidth / 2, this.y - 25, healthWidth, barHeight);
    }
    
    // Helper methods for drawing different shapes
    _drawCircle = (ctx, color) => {
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    _drawSquare = (ctx, color) => {
        ctx.beginPath();
        ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fillStyle = color;
        ctx.fill();
    }

    _drawTriangle = (ctx, color) => {
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    _drawHexagon = (ctx, color) => {
        const sides = 6;
        const size = this.width / 2;
        ctx.beginPath();
        ctx.moveTo(size * Math.cos(0), size * Math.sin(0));
        for (let i = 1; i <= sides; i++) {
            ctx.lineTo(size * Math.cos(i * 2 * Math.PI / sides), size * Math.sin(i * 2 * Math.PI / sides));
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    _drawDiamond = (ctx, color) => {
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(this.width / 2, 0);
        ctx.lineTo(0, this.height / 2);
        ctx.lineTo(-this.width / 2, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
    
    moveTo = (destX, destY) => {
        this.targetX = destX;
        this.targetY = destY;
        this.attackTarget = null;
        this.isCommandedToMove = true;
        this.isCommandedToHQ = false;
        this._findPath(destX, destY);
    }

    commandToHQ = () => {
        const hq = this._findClosestHQ();
        if (hq) {
            this.targetX = hq.x;
            this.targetY = hq.y;
            this.attackTarget = null;
            this.isCommandedToMove = false;
            this.isCommandedToHQ = true;
            this._findPath(hq.x, hq.y);
        }
    }

    _findPath = (destX, destY) => {
        this.path = [];
        this.pathIndex = 0;

        // Check for a straight-line collision to the destination
        if (!this._isPathClear(this.x, this.y, destX, destY)) {
            // Find a detour point if the path is blocked
            const collisionObj = this._getFirstCollision(this.x, this.y, destX, destY);
            if (collisionObj) {
                // Calculate a detour point to one side of the obstacle
                const dx = destX - this.x;
                const dy = destY - this.y;
                const distance = Math.hypot(dx, dy);
                const normDx = dx / distance;
                const normDy = dy / distance;

                // Find a point perpendicular to the collision point
                const detourDistance = 50; // How far to go around the obstacle
                const detourX = collisionObj.x + (normDy * detourDistance);
                const detourY = collisionObj.y - (normDx * detourDistance);
                
                this.path.push({ x: detourX, y: detourY });
                this.path.push({ x: destX, y: destY });
            }
        } else {
            // If the path is clear, just add the destination
            this.path.push({ x: destX, y: destY });
        }
    }
    
    _isPathClear = (startX, startY, endX, endY) => {
        const rayStep = 10;
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.hypot(dx, dy);
        const steps = Math.floor(distance / rayStep);
        const normDx = dx / distance;
        const normDy = dy / distance;

        for (let i = 0; i <= steps; i++) {
            const currentX = startX + normDx * rayStep * i;
            const currentY = startY + normDy * rayStep * i;
            // Use the single source of truth for collision detection
            if (this._getCollidingObject(currentX, currentY, this)) {
                return false;
            }
        }
        return true;
    }
    
    // A single, reusable method for checking collision at a specific point.
    // This removes duplicated code from other methods.
    _getCollidingObject = (x, y, ignoreObject = null) => {
        const tempUnit = {
            id: this.id,
            x: x,
            y: y,
            width: this.width || 30,
            height: this.height || 30,
        };
        for (const objId in this.gameController.gameState.gameObjects) {
            const otherObj = this.gameController.gameState.gameObjects[objId];
            // Skip self and non-solid objects
            if (otherObj.id === this.id || !otherObj.tags.includes('solid') || otherObj === ignoreObject) {
                continue;
            }
            if (otherObj.tags.includes('structure') || otherObj.tags.includes('hq')) {
                const rectX = otherObj.x - otherObj.width / 2;
                const rectY = otherObj.y - otherObj.height / 2;
                const rectWidth = otherObj.width;
                const rectHeight = otherObj.height;
                
                // Find the closest point on the rectangle to the center of the circle
                const closestX = Math.max(rectX, Math.min(tempUnit.x, rectX + rectWidth));
                const closestY = Math.max(rectY, Math.min(tempUnit.y, rectY + rectHeight));

                // Calculate the distance between the circle's center and this closest point
                const dx = tempUnit.x - closestX;
                const dy = tempUnit.y - closestY;
                const distance = Math.sqrt((dx * dx) + (dy * dy));

                // If the distance is less than the unit's radius, there is a collision
                if (distance < tempUnit.width / 2) {
                    return otherObj;
                }
            } else {
                const distance = Math.sqrt(Math.pow(tempUnit.x - otherObj.x, 2) + Math.pow(tempUnit.y - otherObj.y, 2));
                const otherRadius = otherObj.width / 2;
                const unitRadius = tempUnit.width / 2;
                if (distance < unitRadius + otherRadius) {
                    return otherObj;
                }
            }
        }
        return null;
    }

    _getFirstCollision = (startX, startY, endX, endY) => {
        const rayStep = 10;
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.hypot(dx, dy);
        const steps = Math.floor(distance / rayStep);
        const normDx = dx / distance;
        const normDy = dy / distance;
    
        for (let i = 0; i <= steps; i++) {
            const currentX = startX + normDx * rayStep * i;
            const currentY = startY + normDy * rayStep * i;
            // Use the single source of truth to find the colliding object
            const collisionObject = this._getCollidingObject(currentX, currentY);
            if (collisionObject) {
                return collisionObject;
            }
        }
        return null;
    }

    _findClosestHQ = () => {
        let closestHQ = null;
        let minDistance = Infinity;

        for (const id in this.gameController.gameState.gameObjects) {
            const obj = this.gameController.gameState.gameObjects[id];
            // Check if the object is an HQ and is on the same team
            if (obj.tags.includes('hq') && obj.team === this.team) {
                const distance = Math.hypot(this.x - obj.x, this.y - obj.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestHQ = obj;
                }
            }
        }
        return closestHQ;
    }


    findClosestEnemy = () => {
        let closestEnemy = null;
        let minDistance = this.autochaseRange + 1;

        for (const id in this.gameController.gameState.gameObjects) {
            const obj = this.gameController.gameState.gameObjects[id];
            if (obj.team !== this.team && obj.id !== this.id) {
                const distance = Math.hypot(this.x - obj.x, this.y - obj.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = obj;
                }
            }
        }
        return closestEnemy;
    }

    _checkCollision = (newX, newY, ignoreObject = null) => {
        // Now just a simple call to the helper method
        return this._getCollidingObject(newX, newY, ignoreObject) !== null;
    }

    update = () => {
        // If not manually moving or commanded to an HQ, find the closest enemy to attack
        if (!this.isCommandedToMove && !this.isCommandedToHQ) {
            this.attackTarget = this.findClosestEnemy();
        }

        const target = this.isCommandedToMove ? { x: this.targetX, y: this.targetY } : (this.isCommandedToHQ ? this._findClosestHQ() : this.attackTarget);

        if (target) {
            if ((this.isCommandedToMove || this.isCommandedToHQ) && this.path.length > 0) {
                const currentWaypoint = this.path[this.pathIndex];
                const dx = currentWaypoint.x - this.x;
                const dy = currentWaypoint.y - this.y;
                const distance = Math.hypot(dx, dy);

                // Calculate the next position
                const normDx = dx / distance;
                const normDy = dy / distance;
                let nextX = this.x + normDx * this.speed;
                let nextY = this.y + normDy * this.speed;

                // Check for collision at the next position before moving
                if (this._getCollidingObject(nextX, nextY, this)) {
                    // Collision detected, recalculate path from the current position
                    this._findPath(this.targetX, this.targetY);
                } else {
                    // No collision, move to the next position
                    this.x = nextX;
                    this.y = nextY;
                }

                if (distance <= this.speed) {
                    this.pathIndex++;
                    if (this.pathIndex >= this.path.length) {
                        this.path = [];
                        this.isCommandedToMove = false;
                        this.isCommandedToHQ = false;
                    }
                }
            } else {
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const distance = Math.hypot(dx, dy);

                // If we are in attack range, stop and attack.
                if (this.attackTarget && distance <= this.attackRange) {
                    this.attackTarget.health -= this.damage;
                    return;
                }

                // If we are close to the move-to target, stop.
                if (this.isCommandedToMove && distance <= this.speed) {
                    this.x = this.targetX;
                    this.y = this.targetY;
                    this.isCommandedToMove = false;
                    return;
                }

                // Normal movement vector
                const normDx = dx / distance;
                const normDy = dy / distance;
                this.x += normDx * this.speed;
                this.y += normDy * this.speed;
                
            }
        }
    }
}
