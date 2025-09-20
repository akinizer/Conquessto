import { GameController } from './battlefield-game-controller.js';

/**
 * Initializes the game and sets up the battlefield.
 * @param {Object} options - The initialization options.
 * @param {HTMLCanvasElement} options.canvas - The main game canvas.
 * @param {Object} options.uiController - The UI controller for the game.
 * @param {Array<Object>} options.productionItems - List of available production items.
 * @param {Object} options.settings - Game settings.
 */
export function initializeGame({ canvas, uiController, productionItems, settings }) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const gameController = new GameController(canvas, uiController, productionItems);
    uiController.gameController = gameController;
    uiController.initializeUI();
    
    // Pass productionItems to the setup functions for initialization
    setupPlayerOperations(gameController, productionItems);
    setupEnemyOperations(gameController);
    setupNaturalOperations(gameController);
}

/**
 * Sets up player-related operations.
 * @param {GameController} gameController - The game controller instance.
 * @param {Array<Object>} productionItems - List of available production items.
 */
function setupPlayerOperations(gameController, productionItems) {
    // Player operations will be defined here.
    const hqItem = productionItems.find(item => item.name === "HQ");
    const hunterItem = productionItems.find(item => item.name === "Hunter");
    const lightTankItem = productionItems.find(item => item.name === "Light Tank");

    // Spawn point coordinates
    const spawnX = gameController.canvas.width * 0.25;
    const spawnY = gameController.canvas.height * 0.5;
    const team = "friend";

    if (hqItem) {
        gameController.placeBuilding(hqItem, team, spawnX, spawnY);
    }
    
    // Spawn initial player units near the HQ
    if (hunterItem) {
        gameController.spawnUnit(team, spawnX + 75, spawnY, hunterItem);
        gameController.spawnUnit(team, spawnX + 75, spawnY + 40, hunterItem);
        gameController.spawnUnit(team, spawnX + 75, spawnY - 40, hunterItem);
    }
    
    if (lightTankItem) {
        gameController.spawnUnit(team, spawnX + 125, spawnY, lightTankItem);
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
