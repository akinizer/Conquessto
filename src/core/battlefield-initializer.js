// battlefield-initializer.js

import { GameController } from './battlefield-game-controller.js';

export function initializeGame({ canvas, uiController, productionItems, settings }) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const gameController = new GameController(canvas, uiController, productionItems);
    uiController.gameController = gameController;
    uiController.initializeUI();

    setupPlayerOperations(gameController, productionItems);
    setupEnemyOperations(gameController);
    setupNaturalOperations(gameController);
}

/**
 * Sets up player-related operations.
 * @param {GameController} gameController - The game controller instance.
 */
function setupPlayerOperations(gameController, productionItems) {
    // Player operations will be defined here.
    const hqItem = productionItems.find(item => item.name === "HQ");
    if (hqItem) {
        const spawnX = gameController.canvas.width * 0.25;
        const spawnY = gameController.canvas.height * 0.5;
        gameController.placeBuilding(hqItem, "friend", spawnX, spawnY);
    }

    console.log("Player operations setup complete.");
}

/**
 * Sets up enemy-related operations.
 * @param {GameController} gameController - The game controller instance.
 */
function setupEnemyOperations(gameController) {
    // Enemy operations will be defined here.
    console.log("Enemy operations setup complete.");
}

/**
 * Sets up natural, non-player/enemy related operations.
 * @param {GameController} gameController - The game controller instance.
 */
function setupNaturalOperations(gameController) {
    // Natural element operations will be defined here.
    console.log("Natural operations setup complete.");
}