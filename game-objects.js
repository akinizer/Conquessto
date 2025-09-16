// game-objects.js

export class GameObject {
    constructor(id, type, team, x, y, canvas, gameManager) {
        this.id = id;
        this.type = type;
        this.team = team;
        this.x = x;
        this.y = y;
        this.canvas = canvas;
        this.gameManager = gameManager;
        this.health = 100;
        this.maxHealth = 100;
    }
}

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