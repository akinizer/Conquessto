import { BattlefieldManager } from './src/core/BattlefieldManager.js';

window.onload = async () => {
    try {
        // Dynamically load the battlefield.html content and insert it
        const response = await fetch('/src/ui/battlefield.html');
        document.getElementById('app-container').innerHTML = await response.text();

        // Now that the battlefield HTML is loaded, initialize the game.
        const canvas = document.getElementById('gameCanvas');
        const battlefieldManager = new BattlefieldManager(canvas);
        battlefieldManager.run();
    } catch (error) {
        console.error("Failed to load battlefield HTML:", error);
    }
};
