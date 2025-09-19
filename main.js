import { BattlefieldManager } from './src/core/BattlefieldManager.js';

window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    const battlefieldManager = new BattlefieldManager(canvas);
    battlefieldManager.run();
};