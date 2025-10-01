import { GameState } from './battlefield-game-state.js';

import { DataManager } from './battlefield-data-manager.js';

import { BuildingManager } from './submanagers/BuildingManager.js';
import { InputManager } from './submanagers/InputManager.js';
import { CanvasManager } from './submanagers/CanvasManager.js';
import { ResourceService } from './submanagers/ResourceService.js';

export class GameController {
    constructor(canvas, uiController) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.uiController = uiController;
        this.gameState = new GameState();
        // Initialize credits to 0 to prevent "NaN" error.
        this.gameState.resources = {
            credits: 10000, // Initialize credits here
            energy: 0,
            metal: 0,
            substance: 0
        };
        this.lastTime = performance.now(); // For delta time calculation

        // Load JSON data of units and buildings
        this.dataManager = new DataManager();
        this.dataManager.loadProductionData().then(() => {
            console.log('Game data is ready.');
        }).catch(error => {
            console.error('Failed to load game data:', error);
        });

        this.inputManager = new InputManager(this);
        this.canvasManager = new CanvasManager(this);
        this.resourceService = new ResourceService(this);


        // Event listeners for mouse interaction
        this.canvas.addEventListener('mousedown', (event) => this.inputManager.onCanvasLeftClick(event));
        this.canvas.addEventListener('contextmenu', (event) => this.inputManager.onCanvasRightClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.inputManager.onCanvasMouseMove(event));
        this.canvas.addEventListener('mouseleave', () => this.inputManager.onCanvasMouseLeave());

        // Keyboard listeners for camera control
        this.keys = {};
        document.addEventListener('keydown', (event) => { this.keys[event.key] = true; });
        document.addEventListener('keyup', (event) => { this.keys[event.key] = false; });

        this.uiController.gameController = this;
        this.uiController.initializeUI();

        this.pendingBuildingCursorPosition = { x: 0, y: 0 };
        this.canPlaceBuilding = true;

        // World dimensions (4x the canvas size)
        this.WORLD_WIDTH = this.canvas.width * 4;
        this.WORLD_HEIGHT = this.canvas.height * 4;

        // Initialize the viewport (camera)
        this.viewport = { x: 0, y: 0 };
        this.panInterval = null;
        this.mousePosition = { x: 0, y: 0 };

        //Submanagers
        this.buildingManager = new BuildingManager(this);        

        this.canvasManager.gameLoop();
    }
}