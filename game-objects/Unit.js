import { GameObject } from './GameObject.js';

export class Unit extends GameObject {
    constructor(id, team, x, y, canvas, gameManager) {
        super(id, "Unit", team, x, y, canvas, gameManager);
        this.targetX = x;
        this.targetY = y;
        this.speed = 2;
        this.attackRange = 40;
        this.damage = 0.5;
        this.attackTarget = null;
        this.isSelected = false;
        this.searchRange = 200;
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

        for (const id in this.gameManager.gameObjects) {
            const obj = this.gameManager.gameObjects[id];
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

    update() {
        if (this.attackTarget) {
            const distance = Math.sqrt(Math.pow(this.attackTarget.x - this.x, 2) + Math.pow(this.attackTarget.y - this.y, 2));
            if (distance > this.attackRange) {
                this.x += (this.attackTarget.x - this.x) / distance * this.speed;
                this.y += (this.attackTarget.y - this.y) / distance * this.speed;
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
                    this.x += (dx / distance) * this.speed;
                    this.y += (dy / distance) * this.speed;
                }
            }
        }
    }
}
