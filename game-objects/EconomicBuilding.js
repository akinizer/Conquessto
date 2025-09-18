import { Building } from './Building.js';

export class EconomicBuilding extends Building {
    constructor(id, team, x, y, canvas, gameController, itemData) {
        // Correctly pass the tags as an array to the parent constructor.
        super(id, team, x, y, canvas, gameController, ['solid', 'structure', 'economic'], itemData);
    }

    draw(ctx) {
        super.draw(ctx);
        // Add specific drawing logic for economic buildings here if needed
        // For example, an icon or a special color
    }

    update(deltaTime) {
        // Add specific economic-related logic here
        // e.g., generating resources over time
    }
}
