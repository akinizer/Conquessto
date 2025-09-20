export class GameSetupUI {
    constructor(onStartGame) {
        this.config = {
            colors: ['#1e90ff', '#32cd32', '#ff4500', '#ffd700'],
            mapSizes: ['small', 'medium', 'large'],
            mapTypes: ['desert', 'islands', 'volcano', 'forest']
        };

        this.onStartGame = onStartGame;
        this.elements = {};
        this.selectedColor = this.config.colors[0];
        this.selectedMapSize = this.config.mapSizes[1]; // Default to 'medium'
        this.selectedMapType = this.config.mapTypes[0]; // NEW: Default to 'desert'

        this.init();
    }

    init() { 
        this.cacheElements();
        this.renderColorPicker();
        this.setupEventListeners();
    }

    cacheElements() {
        this.elements.overlay = document.getElementById('game-setup-overlay');
        this.elements.form = document.getElementById('gameSetupForm');
        this.elements.playerNameInput = document.getElementById('playerNameInput');
        this.elements.playerColorPicker = document.getElementById('playerColorPicker');
        this.elements.enemyQuantitySlider = document.getElementById('enemyQuantitySlider');
        this.elements.enemyQuantityValue = document.getElementById('enemyQuantityValue');
        this.elements.mapSizeGrid = document.getElementById('mapSizeGrid');
        this.elements.mapTypeGrid = document.getElementById('mapTypeGrid');
    }

    renderColorPicker() {
        this.config.colors.forEach((color, index) => {
            const div = document.createElement('div');
            div.className = 'color-option';
            div.style.backgroundColor = color;
            div.dataset.color = color;
            if (index === 0) {
                div.classList.add('active');
            }
            this.elements.playerColorPicker.appendChild(div);
        });
    }

    setupEventListeners() {
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.hide();
            const settings = this.getSettings();
            this.onStartGame(settings);
        });

        this.elements.playerColorPicker.addEventListener('click', (e) => {
            const colorOption = e.target.closest('.color-option');
            if (colorOption) {
                this.selectColor(colorOption);
            }
        });

        this.elements.enemyQuantitySlider.addEventListener('input', (e) => {
            this.elements.enemyQuantityValue.textContent = e.target.value;
        });

        this.elements.mapSizeGrid.addEventListener('click', (e) => {
            const sizeOption = e.target.closest('.map-size-option');
            if (sizeOption) {
                this.selectMapSize(sizeOption);
            }
        });

        this.elements.mapTypeGrid.addEventListener('click', (e) => {
            const mapTypeOption = e.target.closest('.map-icon-option');
            if (mapTypeOption) {
                this.selectMapType(mapTypeOption);
            }
        });
    }

    selectColor(selectedOption) {
        this.elements.playerColorPicker.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        selectedOption.classList.add('active');
        this.selectedColor = selectedOption.dataset.color;
    }

    selectMapSize(selectedOption) {
        this.elements.mapSizeGrid.querySelectorAll('.map-size-option').forEach(option => {
            option.classList.remove('active');
        });
        selectedOption.classList.add('active');
        this.selectedMapSize = selectedOption.dataset.size;
    }

    selectMapType(selectedOption) {
        this.elements.mapTypeGrid.querySelectorAll('.map-icon-option').forEach(option => {
            option.classList.remove('active');
        });
        selectedOption.classList.add('active');
        this.selectedMapType = selectedOption.dataset.mapType;
    }
        

    show() {
        this.elements.overlay.classList.remove('hidden');
    }

    hide() {
        this.elements.overlay.classList.add('hidden');
    }

    getSettings() {
        return {
            playerName: this.elements.playerNameInput.value,
            playerColor: this.selectedColor,
            enemyQuantity: parseInt(this.elements.enemyQuantitySlider.value, 10),
            mapSize: this.selectedMapSize,
            mapType: this.selectMapType

        };
    }
}