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
