export class ResourceService {
    /**
     * The ResourceService takes the GameController as a dependency so its methods 
     * can access the shared state (gameState) and the UI controller for updates.
     * @param {GameController} gameController 
     */
    constructor(gameController) {
        this.gameController = gameController;
        // Exposing these directly for cleaner access within the service's methods
        this.gameState = gameController.gameState;
        this.uiController = gameController.uiController;
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
