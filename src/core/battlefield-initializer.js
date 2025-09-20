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
    const team = "friend";

    // Assume the map is a fixed, larger size than the visible canvas for spawn calculations
    const mapWidth = gameController.WORLD_WIDTH;
    const mapHeight = gameController.WORLD_HEIGHT;

    // Define a list of exact spawn locations with 3 on the left, 1 in the center, and 3 on the right
    const possibleSpawnLocations = [
        // Left side
        { x: mapWidth * 0.1, y: mapHeight * 0.1, name: "Top-Left" }, 
        { x: mapWidth * 0.1, y: mapHeight * 0.5, name: "Mid-Left" },
        { x: mapWidth * 0.1, y: mapHeight * 0.9, name: "Bottom-Left" },
        // Center
        { x: mapWidth * 0.5, y: mapHeight * 0.5, name: "Center" },
        // Right side
        { x: mapWidth * 0.9, y: mapHeight * 0.1, name: "Top-Right" }, 
        { x: mapWidth * 0.9, y: mapHeight * 0.5, name: "Mid-Right" },
        { x: mapWidth * 0.9, y: mapHeight * 0.9, name: "Bottom-Right" }
    ];

    // Select a random spawn location from the predefined list
    const spawnLocation = possibleSpawnLocations[Math.floor(Math.random() * possibleSpawnLocations.length)];
    const spawnX = spawnLocation.x;
    const spawnY = spawnLocation.y;

    console.log(`Spawning HQ at: ${spawnLocation.name}`);

    if (hqItem) {
        const hq = gameController.placeBuilding(hqItem, team, spawnX, spawnY);
    }
    
    // Spawn initial player units near the HQ with small random offsets
    if (hunterItem) {
        // Function to get a random offset
        const getRandomOffset = () => (Math.random() - 0.5) * 80; // offset between -40 and 40

        gameController.spawnUnit(team, spawnX + 50 + getRandomOffset(), spawnY + getRandomOffset(), hunterItem);
        gameController.spawnUnit(team, spawnX + 50 + getRandomOffset(), spawnY + 40 + getRandomOffset(), hunterItem);
        gameController.spawnUnit(team, spawnX + 50 + getRandomOffset(), spawnY - 40 + getRandomOffset(), hunterItem);
    }
    
    if (lightTankItem) {
        const getRandomOffset = () => (Math.random() - 0.5) * 80;
        gameController.spawnUnit(team, spawnX + 100 + getRandomOffset(), spawnY + getRandomOffset(), lightTankItem);
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
