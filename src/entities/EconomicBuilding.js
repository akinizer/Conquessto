import { Building } from './Building.js';

export class EconomicBuilding extends Building {
    constructor(id, team, x, y, canvas, gameController, itemData) {
        // Correctly pass the tags as an array to the parent constructor.
        super(id, team, x, y, canvas, gameController, ['solid', 'structure', 'economic'], itemData);
        this.type = "EconomicBuilding";

        // Add properties for resource generation
        this.resourceType = itemData.resourceType;
        this.generationRate = itemData.generationRate;
    }

    draw(ctx) {
        super.draw(ctx);
        // Add specific drawing logic for economic buildings here if needed
    }

    /**
     * Updates the economic building's state.
     * @param {number} deltaTime The time elapsed since the last frame in seconds.
     */
    update(deltaTime) {
        // Call the parent update method.
        super.update(deltaTime);

        // Check if this building is configured to generate resources.
        if (this.resourceType && this.generationRate) {
            // Calculate resources to generate based on time elapsed.
            const resourcesToGenerate = this.generationRate * deltaTime;

            // Add the resources to the game's global resource pool via the GameController.
            this.gameController.addResources(this.resourceType, resourcesToGenerate);
        }
    }
}
