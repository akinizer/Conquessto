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

    // First, create the UIController. We can pass a null reference initially
    // and set it later to avoid a circular dependency.
    uiController = new UIController(null, productionItems);

    // Then, create the GameController, passing the uiController to it.
    gameController = new GameController(canvas, uiController);

    // Now, complete the circular reference by setting the gameController on the uiController.
    uiController.gameController = gameController;

    // Initialize the UI.
    uiController.initializeUI();
};