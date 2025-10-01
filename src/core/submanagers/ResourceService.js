export class ResourceService {
    constructor(gameController) {
        this.gameController = gameController;
        this.gameState = gameController.gameState;
        this.uiController = gameController.uiController;

        this.gameState.resources = { credits: 1000, energy: 0, metal: 0, substance: 0 };
        
        // assign base resources
        Object.keys(this.gameState.resources).forEach(resource => this.uiController.updateResourceCountAnimated(resource, this.gameState.resources[resource]));
    }

    isAffordable(cost) {
        if (!cost) {
            return true;
        }
        for (const resource in cost) {
            if (!this.gameState.resources.hasOwnProperty(resource) || this.gameState.resources[resource] < cost[resource]) {
                return false;
            }
        }
        return true;
    }

    deductCost(cost) {
        if (!cost) {
            return;
        }
        for (const resource in cost) {
            if (this.gameState.resources.hasOwnProperty(resource)) {
                // Deduct the cost from the game state
                this.gameState.resources[resource] -= cost[resource];

                // NEW: Trigger the digit change animation with the final value
                this.uiController.updateResourceCountAnimated(resource, this.gameState.resources[resource]);
            }
        }
    }
}
