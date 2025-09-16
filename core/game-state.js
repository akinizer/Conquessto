// /core/game-state.js

export class GameState {
    constructor() {
        this.gameObjects = {};
        this.nextObjectId = 0;
        this.pendingBuilding = null;
        this.productionBuilding = null;
        this.selectedUnits = [];
    }

    getNextId() {
        this.nextObjectId++;
        return this.nextObjectId;
    }

    addObject(obj) {
        this.gameObjects[obj.id] = obj;
    }

    removeObject(id) {
        delete this.gameObjects[id];
    }
}