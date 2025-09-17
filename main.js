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
    const productionItems = dataManager.getProductionItems();

    // Dynamically load the game setup HTML content
    const setupMenuContainer = document.getElementById('setup-menu-container');
    const response = await fetch('./ui/game-setup.html');
    const setupHtml = await response.text();
    setupMenuContainer.innerHTML = setupHtml;

    // The rest of the setup logic
    uiController = new UIController(productionItems);

    const gameSetup = new GameSetupUI((settings) => {
        console.log("Game settings:", settings);

        // 🎯 Set the canvas drawing size to match its display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        gameController = new GameController(canvas, uiController);
        uiController.gameController = gameController;
        uiController.initializeUI();
    });

    gameSetup.show();
};