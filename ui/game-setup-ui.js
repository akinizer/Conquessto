export class GameSetupUI {
    constructor(onStartGame) {
        this.overlay = document.getElementById('game-setup-overlay');
        this.startButton = document.getElementById('startGameButton');
        this.playerNameInput = document.getElementById('playerNameInput');
        this.playerColorPicker = document.getElementById('playerColorPicker');
        this.enemyQuantityInput = document.getElementById('enemyQuantityInput');
        this.mapSizeInput = document.getElementById('mapSizeInput');
        this.onStartGame = onStartGame; // Callback to run when the game starts
        this.selectedColor = '#1e90ff';

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => {
            this.hide();
            const settings = this.getSettings();
            this.onStartGame(settings);
        });

        this.playerColorPicker.querySelectorAll('.color-option').forEach(colorOption => {
            colorOption.addEventListener('click', () => {
                this.selectColor(colorOption);
            });
        });
    }

    selectColor(selectedOption) {
        this.playerColorPicker.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        selectedOption.classList.add('active');
        this.selectedColor = selectedOption.getAttribute('data-color');
    }

    show() {
        this.overlay.classList.remove('hidden');
    }

    hide() {
        this.overlay.classList.add('hidden');
    }

    getSettings() {
        return {
            playerName: this.playerNameInput.value,
            playerColor: this.selectedColor,
            enemyQuantity: parseInt(this.enemyQuantityInput.value, 10),
            mapSize: this.mapSizeInput.value
        };
    }
}