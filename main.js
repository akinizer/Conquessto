import { GameController } from './core/game-controller.js';
import { UIController } from './ui/ui-controller.js';
import { DataManager } from './core/data-manager.js';
import { GameSetupUI } from './ui/game-setup-ui.js';

let gameController;
let uiController;
let dataManager;

window.onload = async () => {
    const canvas = document.getElementById('gameCanvas');
    dataManager = new DataManager();

    await dataManager.loadProductionData();
    // 🛠️ FIX: Get the original structured object.
    const productionData = dataManager.getProductionItems();
    
    // We can still create a combined array for other parts of the game.
    const productionItems = [...productionData.units, ...productionData.buildings];

    // Dynamically load the game setup HTML content
    const setupMenuContainer = document.getElementById('setup-menu-container');
    const response = await fetch('./ui/game-setup.html');
    const setupHtml = await response.text();
    setupMenuContainer.innerHTML = setupHtml;

    // The rest of the setup logic
    // 🛠️ FIX: Pass the structured productionData object.
    uiController = new UIController(productionData);

    const gameSetup = new GameSetupUI((settings) => {
        console.log("Game settings:", settings);

        // 🎯 Set the canvas drawing size to match its display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        gameController = new GameController(canvas, uiController, productionItems);
        uiController.gameController = gameController;
        uiController.initializeUI();

        // 🛠️ NEW: Place the HQ building at the start of the game.
        const hqItem = productionItems.find(item => item.name === "HQ");
        if (hqItem) {
            // Place the HQ for the player's team at a default location.
            const spawnX = canvas.width * 0.25;
            const spawnY = canvas.height * 0.5;
            gameController.placeBuilding(hqItem, "friend", spawnX, spawnY);
        } else {
            console.error("HQ item data not found in production data.");
        }
    });

    gameSetup.show();
};
