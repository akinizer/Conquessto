export class GameObject {
    constructor(id, type, team, x, y, canvas, gameController, tags = []) {
        this.id = id;
        this.type = type;
        this.team = team;
        this.x = x;
        this.y = y;
        this.canvas = canvas;
        this.gameController = gameController;
        this.health = 100;
        this.maxHealth = 100;
        this.tags = tags;
    }
}