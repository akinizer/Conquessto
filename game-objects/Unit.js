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
        this.attackRange = 40;
        this.damage = 0.5;
        this.attackTarget = null;
        this.isSelected = false;
        this.searchRange = 200;
        this.gameController = gameController;
        this.tags = tags;
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

        // Save the current state of the canvas
        ctx.save();
        
        // Translate the canvas context to the unit's position for easier drawing
        ctx.translate(this.x, this.y);

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
            // Because we're inside a save/restore block and have already translated, 
            // the stroke will be applied to the last shape drawn.
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
        // Removed the ctx.stroke() from here
    }

    _drawSquare = (ctx, color) => {
        ctx.beginPath();
        ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fillStyle = color;
        ctx.fill();
        // Removed the ctx.stroke() from here
    }

    _drawTriangle = (ctx, color) => {
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        // Removed the ctx.stroke() from here
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
        // Removed the ctx.stroke() from here
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
        // Removed the ctx.stroke() from here
    }
    
    // ... all other methods remain the same as before
    moveTo = (destX, destY) => {
        this.targetX = destX;
        this.targetY = destY;
        this.attackTarget = null;
    }

    findClosestEnemy = () => {
        let closestEnemy = null;
        let minDistance = Infinity;
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
        const tempUnit = {
            id: this.id,
            x: newX,
            y: newY,
            width: this.width || 30,
            height: this.height || 30,
        };
        for (const objId in this.gameController.gameState.gameObjects) {
            const otherObj = this.gameController.gameState.gameObjects[objId];
            if (otherObj.id === this.id || !otherObj.tags.includes('solid') || otherObj === ignoreObject) {
                continue;
            }
            if (otherObj.tags.includes('structure')) {
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
                const distance = Math.sqrt(Math.pow(tempUnit.x - otherObj.x, 2) + Math.pow(tempUnit.y - otherObj.y, 2));
                const otherRadius = otherObj.width / 2;
                if (distance < unitRadius + otherRadius) {
                    return true;
                }
            }
        }
        return false;
    }

    update = () => {
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