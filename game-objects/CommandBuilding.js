import { Building } from './Building.js';

export class CommandBuilding extends Building {
    constructor(id, team, x, y, canvas, gameController, itemData) {
        // Pass the correct tags as an array to the parent constructor.
        // The itemData is passed as the final argument.
        super(id, team, x, y, canvas, gameController, ['solid', 'structure', 'command'], itemData);

        // The width and height are now correctly inherited from the itemData property via the parent class.
    }

    draw(ctx) {
        super.draw(ctx);
        // Add specific drawing logic for the command building here.
    }

    update(deltaTime) {
        // Command-specific logic goes here
    }
}
