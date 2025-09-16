import { GameObject } from './GameObject.js';

export class Unit extends GameObject {
    constructor(id, team, x, y, width, height, canvas, gameController, tags = []) {
        super(id, "Unit", team, x, y, canvas, gameController, tags);

            // 🔑 Set the width and height from the constructor parameters
        this.width = width;
        this.height = height;

        this.targetX = x;
        this.targetY = y;
        this.speed = 2;
        this.attackRange = 40;
        this.damage = 0.5;
        this.attackTarget = null;
        this.isSelected = false;
        this.searchRange = 200;
        this.gameController = gameController;
        this.tags = tags;
    }

    select() {
        this.isSelected = true;
    }

    deselect() {
        this.isSelected = false;
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        const size = 15;
        const color = this.team === "friend" ? "blue" : "red";
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (this.isSelected) {
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        const barWidth = 30;
        const barHeight = 5;
        ctx.fillStyle = "#555";
        ctx.fillRect(this.x - barWidth / 2, this.y - 25, barWidth, barHeight);
        ctx.fillStyle = "green";
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillRect(this.x - barWidth / 2, this.y - 25, healthWidth, barHeight);
    }
    
    moveTo(destX, destY) {
        this.targetX = destX;
        this.targetY = destY;
        this.attackTarget = null;
    }

    findClosestEnemy() {
        let closestEnemy = null;
        let minDistance = Infinity;

        for (const id in this.gameController.gameObjects) {
            const obj = this.gameController.gameObjects[id];
            if (obj.team !== this.team) {
                const distance = Math.sqrt(Math.pow(obj.x - this.x, 2) + Math.pow(obj.y - this.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = obj;
                }
            }
        }
        
        return minDistance <= this.searchRange ? closestEnemy : null;
    }

    _checkCollision(newX, newY, ignoreObject = null) {
        const tempUnit = {
            id: this.id,
            x: newX,
            y: newY,
            width: this.width || 30,
            height: this.height || 30,
        };
        
        for (const objId in this.gameController.gameState.gameObjects) {
            const otherObj = this.gameController.gameState.gameObjects[objId];
            
            // Skip checking against itself, ignored objects, and non-solid objects
            if (otherObj.id === this.id || !otherObj.tags.includes('solid') || otherObj === ignoreObject) {
                continue;
            }

            // Check for collision based on the other object's shape
            if (otherObj.tags.includes('structure')) {
                // Circle-to-Rectangle collision
                const distX = Math.abs(tempUnit.x - otherObj.x);
                const distY = Math.abs(tempUnit.y - otherObj.y);

                const halfOtherWidth = otherObj.width / 2;
                const halfOtherHeight = otherObj.height / 2;
                const unitRadius = tempUnit.width / 2;

                if (distX > (halfOtherWidth + unitRadius) || distY > (halfOtherHeight + unitRadius)) {
                    continue;
                }
                if (distX <= halfOtherWidth || distY <= halfOtherHeight) {
                    return true;
                }

                const dx = distX - halfOtherWidth;
                const dy = distY - halfOtherHeight;
                if ((dx * dx + dy * dy) <= (unitRadius * unitRadius)) {
                    return true;
                }
            } else {
                // Circle-to-Circle collision
                const distance = Math.sqrt(Math.pow(tempUnit.x - otherObj.x, 2) + Math.pow(tempUnit.y - otherObj.y, 2));
                const otherRadius = otherObj.width / 2;
                if (distance < unitRadius + otherRadius) {
                    return true;
                }
            }
        }
        return false;
    }

    update() {
        if (this.attackTarget) {
            const distance = Math.sqrt(Math.pow(this.attackTarget.x - this.x, 2) + Math.pow(this.attackTarget.y - this.y, 2));
            if (distance > this.attackRange) {
                const nextX = this.x + (this.attackTarget.x - this.x) / distance * this.speed;
                const nextY = this.y + (this.attackTarget.y - this.y) / distance * this.speed;
                if (!this._checkCollision(nextX, nextY)) {
                    this.x = nextX;
                    this.y = nextY;
                }
            } else {
                this.attackTarget.health -= this.damage;
            }
        } else {
            const closestEnemy = this.findClosestEnemy();
            if (closestEnemy) {
                this.attackTarget = closestEnemy;
                return;
            }

            if (this.x !== this.targetX || this.y !== this.targetY) {
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= this.speed) {
                    this.x = this.targetX;
                    this.y = this.targetY;
                } else {
                    const nextX = this.x + (dx / distance) * this.speed;
                    const nextY = this.y + (dy / distance) * this.speed;
                    if (!this._checkCollision(nextX, nextY)) {
                        this.x = nextX;
                        this.y = nextY;
                    }
                }
            }
        }
    }
}
