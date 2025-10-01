// /core/game-state.js

export class GameState {
    constructor() {
        // Canvas Objects
        this.gameObjects = {};
        this.nextObjectId = 0;
        this.pendingBuilding = null;
        this.productionBuilding = null;
        this.selectedUnits = [];

        // Hover Label
        this.hoveredObject = null;
        this.hoverTimeoutId = null; 
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

    updateResources(type, amount) {
        if (this.resources[type] !== undefined) {
            this.resources[type] += amount;
        }
    }
}