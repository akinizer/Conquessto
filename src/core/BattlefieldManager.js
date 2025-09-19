import { UIController } from '../ui/battlefield-ui-controller.js';
import { DataManager } from './battlefield-data-manager.js';
import { GameSetupUI } from '../ui/batlefield-game-setup-ui.js';
import { initializeGame } from './battlefield-initializer.js';

export class BattlefieldManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.uiController = null;
        this.dataManager = new DataManager();
        this.productionData = null;
        this.productionItems = null;
    }

    async run() {
        await this.dataManager.loadProductionData();
        this.productionData = this.dataManager.getProductionItems();
        this.productionItems = [...this.productionData.units, ...this.productionData.buildings];

        const setupMenuContainer = document.getElementById('setup-menu-container');
        const response = await fetch('src/ui/battlefield-game-setup.html');
        const setupHtml = await response.text();
        setupMenuContainer.innerHTML = setupHtml;

        this.uiController = new UIController(this.productionData);

        const setupProps = (settings) => {
            initializeGame({
                canvas: this.canvas,
                uiController: this.uiController,
                productionItems: this.productionItems,
                settings
            });
        };
        const gameSetup = new GameSetupUI(setupProps);

        gameSetup.show();
    }
}