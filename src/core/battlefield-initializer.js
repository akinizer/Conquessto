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

    // Store player color in  the GameController's game state
    gameController.gameState.playerColor = settings.playerColor;
    
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
 * @param {Object} settings - Game settings. ⬅️ ADDED SETTINGS HERE
 */
function setupPlayerOperations(gameController, productionItems, playerSpawnLocation) {
    const initialItems = {
        hq: productionItems.find(item => item.name === "HQ"),
        hunter: productionItems.find(item => item.name === "Hunter"),
        lightTank: productionItems.find(item => item.name === "Light Tank")
    };

    const team = "friend";

    const mapWidth = gameController.WORLD_WIDTH;
    const mapHeight = gameController.WORLD_HEIGHT;
    const spawnX = mapWidth * playerSpawnLocation.x;
    const spawnY = mapHeight * playerSpawnLocation.y;

    const spawnDirection = getSpawnDirection(playerSpawnLocation);

    console.log(`Spawning player HQ at: ${playerSpawnLocation.name}`);

    // Create the list of initial units to spawn for the player
    const playerSpawns = createInitialUnitSpawns(initialItems, spawnX, spawnY, spawnDirection);

    // Loop through the list and place each object
    for (const spawn of playerSpawns) {
        if (spawn.item.type === "Command") { // This should be the HQ
            gameController.buildingManager.placeBuilding(spawn.item, team, spawn.x, spawn.y);
        } else {
            gameController.buildingManager.spawnUnit(team, spawn.x, spawn.y, spawn.item);
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
    const initialItems = {
        hq: productionItems.find(item => item.name === "HQ"),
        hunter: productionItems.find(item => item.name === "Hunter"),
        lightTank: null // disabled spawn
    };
    const team = "foe";

    const mapWidth = gameController.WORLD_WIDTH;
    const mapHeight = gameController.WORLD_HEIGHT;
    const spawnX = mapWidth * enemySpawnLocation.x;
    const spawnY = mapHeight * enemySpawnLocation.y;

    const enemyDirection = getSpawnDirection(enemySpawnLocation); 
    console.log(`Spawning enemy HQ at: ${enemySpawnLocation.name}`);

    // Create the list of initial units to spawn for the enemy
    const enemySpawns = createInitialUnitSpawns(initialItems, spawnX, spawnY, enemyDirection);

    // Loop through the list and place each object
    for (const spawn of enemySpawns) {
        if (spawn.item.type === "Command") { // This should be the HQ
            gameController.buildingManager.placeBuilding(spawn.item, team, spawn.x, spawn.y);
        } else {
            gameController.buildingManager.spawnUnit(team, spawn.x, spawn.y, spawn.item);
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
function createInitialUnitSpawns(initialItems, spawnX, spawnY, direction) {
    const spawns = [];

    // Determine offsets based on direction in a clean integration
    const {
        offsetX, offsetY, 
        staggerX, staggerY, 
        tankOffsetX, tankOffsetY 
    } = calculateSpawnOffsets(direction);

    const hqItem = initialItems.hq;
    const hunterItem = initialItems.hunter;
    const lightTankItem = initialItems.lightTank;

    // Place the HQ first
    if (hqItem) {
        spawns.push({ item: hqItem, x: spawnX, y: spawnY });
    }

    // --- Place Units --- //

    // Hunter Units
    if (hunterItem) {
        // Hunter 1 (Primary offset)
        spawns.push({item: hunterItem, x: spawnX + offsetX, y: spawnY + offsetY});
        
        // Hunter 2 (Staggered positive)
        spawns.push({item: hunterItem, x: spawnX + offsetX + staggerX, y: spawnY + offsetY + staggerY});
        
        // Hunter 3 (Staggered negative)
        spawns.push({item: hunterItem, x: spawnX + offsetX - staggerX, y: spawnY + offsetY - staggerY});
    }

    // Light Tank Unit
    if (lightTankItem) {
        spawns.push({item: lightTankItem, x: spawnX + tankOffsetX, y: spawnY + tankOffsetY});
    }

    return spawns;
}

function calculateSpawnOffsets(direction) {
    let offsetX = 0; // Primary horizontal offset
    let offsetY = 0; // Primary vertical offset
    let staggerX = 0; // Horizontal staggering for units
    let staggerY = 0; // Vertical staggering for units

    // Set primary offsets based on direction
    if (direction === "right") {
        offsetX = 100;
        staggerY = 40; // Stagger units vertically when moving right
    } else if (direction === "left") {
        offsetX = -100;
        staggerY = 40; // Stagger units vertically when moving left
    } else if (direction === "down") {
        offsetY = 100;
        staggerX = 40; // Stagger units horizontally when moving down
    } else if (direction === "up") {
        offsetY = -100;
        staggerX = 40; // Stagger units horizontally when moving up
    }
    
    // Calculate larger offsets for the tank (1.5x the primary offset)
    const tankOffsetX = offsetX * 1.5;
    const tankOffsetY = offsetY * 1.5;

    return { offsetX, offsetY, staggerX, staggerY, tankOffsetX, tankOffsetY };
}

function getSpawnDirection(spawnLocation) {
    // 1. Define the four possible cardinal directions
    const cardinalDirections = ["left", "right", "up", "down"];
    
    // 2. Determine the optimal direction based on location (Center-seeking)
        
    // Determine direction based on spawn location. True picks a random direction.
    if (spawnLocation.x < 0.5) { return "right"; } 
    else if (spawnLocation.x > 0.5) { return "left"; } 
    else if (spawnLocation.y < 0.5) { return "down"; } 
    else if (spawnLocation.y > 0.5) { return "up"; } 
    else {
        const randomIndex = Math.floor(Math.random() * cardinalDirections.length);
        return cardinalDirections[randomIndex];
    }
}