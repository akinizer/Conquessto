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
    
    // Select a random map for the entire game session.
    const selectedMap = mapData[Math.floor(Math.random() * mapData.length)];
    // Create a mutable copy of the spawn locations to prevent players from spawning on the same spot.
    const possibleSpawnLocations = [...selectedMap.possibleSpawnLocations];
    
    // Choose a random location for the player and remove it from the pool.
    const playerSpawnIndex = Math.floor(Math.random() * possibleSpawnLocations.length);
    const playerSpawnLocation = possibleSpawnLocations.splice(playerSpawnIndex, 1)[0];
    
    // Choose a random location for the enemy from the remaining pool.
    const enemySpawnIndex = Math.floor(Math.random() * possibleSpawnLocations.length);
    const enemySpawnLocation = possibleSpawnLocations[enemySpawnIndex];
    
    console.log(`Selected Map: ${selectedMap.name}`);

    // Pass the unique spawn locations to the respective setup functions.
    setupPlayerOperations(gameController, productionItems, playerSpawnLocation);
    setupEnemyOperations(gameController, productionItems, enemySpawnLocation);
    setupNaturalOperations(gameController);
    
    // Automatically move the camera to the HQ position after a short delay
    setTimeout(() => {
        const hq = Object.values(gameController.gameState.gameObjects).find(obj =>
            obj.team === 'friend' && obj.itemData.type === 'Command'
        );
        
        if (hq) {
            // Calculate potential viewport coordinates to center on the HQ
            let newViewportX = hq.x - gameController.canvas.width / 2;
            let newViewportY = hq.y - gameController.canvas.height / 2;

            // Clamp the new coordinates to the world boundaries
            gameController.viewport.x = Math.max(0, Math.min(gameController.WORLD_WIDTH - gameController.canvas.width, newViewportX));
            gameController.viewport.y = Math.max(0, Math.min(gameController.WORLD_HEIGHT - gameController.canvas.height, newViewportY));

            gameController.uiController.setStatus("Camera moved to HQ.");
        }
    }, 100); // 100ms delay to ensure all objects are rendered
}

const spawnLocations = {
    TopLeft: { name: "Top-Left", x: 0.1, y: 0.1 },
    MidLeft: { name: "Mid-Left", x: 0.1, y: 0.5 },
    BottomLeft: { name: "Bottom-Left", x: 0.1, y: 0.9 },
    TopCenter: { name: "Top-Center", x: 0.5, y: 0.1 },
    MidCenter: { name: "Mid-Center", x: 0.5, y: 0.5 },
    BottomCenter: { name: "Bottom-Center", x: 0.5, y: 0.9 },
    TopRight: { name: "Top-Right", x: 0.9, y: 0.1 },
    MidRight: { name: "Mid-Right", x: 0.9, y: 0.5 },
    BottomRight: { name: "Bottom-Right", x: 0.9, y: 0.9 }
}

// Define a list of maps with their unique spawn locations
const mapData = [
    {
        name: "First Map",
        spawnFormat: [3,1,3],
        possibleSpawnLocations: [
            // Left side
            spawnLocations.TopLeft, spawnLocations.MidLeft, spawnLocations.BottomLeft,
            // Center
            spawnLocations.MidCenter,
            // Right side
            spawnLocations.TopRight, spawnLocations.MidRight, spawnLocations.BottomRight
        ]
    },
    {
        name: "Second Map",
        spawnFormat: [2,0,1],
        possibleSpawnLocations: [
            // Left side
            spawnLocations.TopLeft, 
            spawnLocations.BottomLeft,
            // Right side
            spawnLocations.MidRight
        ]
    },
    {
        name: "Third Map",
        spawnFormat: [3,3,3],
        possibleSpawnLocations: [
            // Left side
            spawnLocations.TopLeft, spawnLocations.MidLeft, spawnLocations.BottomLeft,
            // Center
            spawnLocations.TopCenter, spawnLocations.MidCenter, spawnLocations.BottomCenter,
            // Right side
            spawnLocations.TopRight, spawnLocations.MidRight, spawnLocations.BottomRight
        ]
    }
];

/**
 * Sets up player-related operations.
 * @param {GameController} gameController - The game controller instance.
 * @param {Array<Object>} productionItems - List of available production items.
 * @param {Object} playerSpawnLocation - The pre-selected spawn location for the player.
 */
function setupPlayerOperations(gameController, productionItems, playerSpawnLocation) {
    const hqItem = productionItems.find(item => item.name === "HQ");
    const hunterItem = productionItems.find(item => item.name === "Hunter");
    const lightTankItem = productionItems.find(item => item.name === "Light Tank");
    const team = "friend";

    const mapWidth = gameController.WORLD_WIDTH;
    const mapHeight = gameController.WORLD_HEIGHT;
    const spawnX = mapWidth * playerSpawnLocation.x;
    const spawnY = mapHeight * playerSpawnLocation.y;

    console.log(`Spawning player HQ at: ${playerSpawnLocation.name}`);

    // Create the list of initial units to spawn for the player
    const playerSpawns = createInitialUnitSpawns(hqItem, hunterItem, lightTankItem, spawnX, spawnY, "right");

    // Loop through the list and place each object
    for (const spawn of playerSpawns) {
        if (spawn.item.type === "Command") { // This should be the HQ
            gameController.placeBuilding(spawn.item, team, spawn.x, spawn.y);
        } else {
            gameController.spawnUnit(team, spawn.x, spawn.y, spawn.item);
        }
    }

    console.log("Player operations setup complete.");
}

/**
 * Sets up enemy-related operations.
 * @param {GameController} gameController - The game controller instance.
 * @param {Array<Object>} productionItems - List of available production items.
 * @param {Object} enemySpawnLocation - The pre-selected spawn location for the enemy.
 */
function setupEnemyOperations(gameController, productionItems, enemySpawnLocation) {
    const hqItem = productionItems.find(item => item.name === "HQ");
    const hunterItem = productionItems.find(item => item.name === "Hunter");
    const team = "foe";

    const mapWidth = gameController.WORLD_WIDTH;
    const mapHeight = gameController.WORLD_HEIGHT;
    const spawnX = mapWidth * enemySpawnLocation.x;
    const spawnY = mapHeight * enemySpawnLocation.y;

    console.log(`Spawning enemy HQ at: ${enemySpawnLocation.name}`);

    // Create the list of initial units to spawn for the enemy
    const enemySpawns = createInitialUnitSpawns(hqItem, hunterItem, null, spawnX, spawnY, "left");

    // Loop through the list and place each object
    for (const spawn of enemySpawns) {
        if (spawn.item.type === "Command") { // This should be the HQ
            gameController.placeBuilding(spawn.item, team, spawn.x, spawn.y);
        } else {
            gameController.spawnUnit(team, spawn.x, spawn.y, spawn.item);
        }
    }

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

/**
 * Creates the initial spawn configuration for a team.
 * @param {Object} hqItem - The HQ item data.
 * @param {Object} hunterItem - The Hunter unit item data.
 * @param {Object} lightTankItem - The Light Tank unit item data.
 * @param {number} spawnX - The base X coordinate for the spawn.
 * @param {number} spawnY - The base Y coordinate for the spawn.
 * @param {string} direction - "left" or "right" to offset units.
 * @returns {Array<Object>} An array of objects to be spawned, with their item data and positions.
 */
function createInitialUnitSpawns(hqItem, hunterItem, lightTankItem, spawnX, spawnY, direction) {
    const spawns = [];
    const offset = direction === "right" ? 100 : -100;
    const tankOffset = direction === "right" ? 150 : -150;

    // Place the HQ first
    if (hqItem) {
        spawns.push({ item: hqItem, x: spawnX, y: spawnY });
    }

    // Place the units with staggered offsets
    if (hunterItem) {
        spawns.push({ item: hunterItem, x: spawnX + offset, y: spawnY });
        spawns.push({ item: hunterItem, x: spawnX + offset, y: spawnY + 40 });
        spawns.push({ item: hunterItem, x: spawnX + offset, y: spawnY - 40 });
    }

    if (lightTankItem) {
        spawns.push({ item: lightTankItem, x: spawnX + tankOffset, y: spawnY });
    }

    return spawns;
}
