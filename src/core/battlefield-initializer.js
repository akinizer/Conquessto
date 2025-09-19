import { GameController } from './battlefield-game-controller.js';

export function initializeGame({ canvas, uiController, productionItems, settings }) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const gameController = new GameController(canvas, uiController, productionItems);
    uiController.gameController = gameController;
    uiController.initializeUI();

    const hqItem = productionItems.find(item => item.name === "HQ");
    if (hqItem) {
        const spawnX = canvas.width * 0.25;
        const spawnY = canvas.height * 0.5;
        gameController.placeBuilding(hqItem, "friend", spawnX, spawnY);
    }
}