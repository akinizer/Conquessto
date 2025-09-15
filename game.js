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
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        const size = 15;
        const color = this.team === "friend" ? "blue" : "red";
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
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

    update() {
        if (this.attackTarget) {
            const distance = Math.sqrt(Math.pow(this.attackTarget.x - this.x, 2) + Math.pow(this.attackTarget.y - this.y, 2));
            if (distance > this.attackRange) {
                this.x += (this.attackTarget.x - this.x) / distance * this.speed;
                this.y += (this.attackTarget.y - this.y) / distance * this.speed;
            } else {
                this.attackTarget.health -= this.damage;
            }
        } else if (this.x !== this.targetX || this.y !== this.targetY) {
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
        this.productionQueue = [];
        this.isProducing = false;
        this.productionTime = 100;
        this.productionTimer = 0;
        this.rallyPoint = { x: this.x + 80, y: this.y };
        this.isSelected = false;
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

        // Add the '+' button on placed barracks
        const buttonSize = 10;
        const buttonX = this.x + size - 5;
        const buttonY = this.y + size - 5;
        
        // Draw the background square for the button
        ctx.fillStyle = "#FFFFFF"; // White background
        ctx.fillRect(buttonX - buttonSize, buttonY - buttonSize, buttonSize * 2, buttonSize * 2);
        
        // Draw the black '+' sign
        ctx.strokeStyle = "#000000"; // Black color for the '+'
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Horizontal line of the '+'
        ctx.moveTo(buttonX - buttonSize + 3, buttonY);
        ctx.lineTo(buttonX + buttonSize - 3, buttonY);
        // Vertical line of the '+'
        ctx.moveTo(buttonX, buttonY - buttonSize + 3);
        ctx.lineTo(buttonX, buttonY + buttonSize - 3);
        ctx.stroke();
    }

    update() {
        if (this.productionQueue.length > 0 && !this.isProducing) {
            this.isProducing = true;
            this.productionTimer = this.productionQueue[0].time;
        }
        if (this.isProducing) {
            this.productionTimer--;
            if (this.productionTimer <= 0) {
                const itemToSpawn = this.productionQueue.shift();
                if (itemToSpawn.type === "Unit") {
                    const newUnit = this.gameManager.spawnUnit(this.team, this.x, this.y);
                    newUnit.moveTo(this.rallyPoint.x, this.rallyPoint.y);
                }
                this.isProducing = false;
            }
        }
    }
}