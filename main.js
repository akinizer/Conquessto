// main.js

import { GameController } from './core/game-controller.js';
import { UIController } from './ui/ui-controller.js';
import { DataManager } from './core/data-manager.js';

let gameController;
let uiController;
let dataManager;

window.onload = async () => {
    const canvas = document.getElementById('gameCanvas');
    dataManager = new DataManager();

    await dataManager.loadProductionData();
    const productionItems = dataManager.getProductionItems();

    // 1. Create the UIController first, passing the loaded data.
    uiController = new UIController(productionItems);

    // 2. Then, create the GameController, passing the uiController to it.
    gameController = new GameController(canvas, uiController);

    // 3. Now, complete the circular reference by setting the gameController on the uiController.
    // This must happen BEFORE initializeUI is called.
    uiController.gameController = gameController;

    // 4. Initialize the UI. Now all the links are properly set.
    uiController.initializeUI();
};