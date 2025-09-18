import { Building } from './Building.js';

export class OtherBuilding extends Building {
    constructor(id, team, x, y, canvas, gameController, itemData) {
        // Correctly pass the tags as an array to the parent constructor.
        super(id, team, x, y, canvas, gameController, ['solid', 'structure', 'other'], itemData);
    }

    draw(ctx) {
        super.draw(ctx);
        // Add specific drawing logic for other building types here.
    }

    update(deltaTime) {
        // Add specific logic for other building types here.
    }
}
