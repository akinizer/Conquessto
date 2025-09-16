// ui/ui-controller.js
export class UIController {
    constructor(productionItems) {
        this.productionItems = productionItems;
        this.productionGrid = document.getElementById('production-grid');
        this.tabButtons = document.querySelectorAll('.tab');
        this.panelStatus = document.getElementById('panel-status');
        this.gameController = null;
    }

    initializeUI() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const tabType = button.getAttribute('data-tab');
                this.renderProductionButtons(this.productionItems[tabType]);
            });
        });
        document.querySelector('.tab[data-tab="units"]').click();
        this.setStatus("Ready.");
    }

    renderProductionButtons(items) {
        this.productionGrid.innerHTML = '';
        items.forEach(item => {
            const button = document.createElement('div');
            button.className = 'unit-button';
            button.textContent = item.name;

            button.onclick = () => {
                this.gameController.trainItem(item, button);
            };
            this.productionGrid.appendChild(button);
        });
    }

    setStatus(message) {
        this.panelStatus.textContent = message;
    }

    clearProductionPanel() {
        const productionPanel = document.getElementById('production-grid');
        if (productionPanel) {
            productionPanel.innerHTML = '';
        }
    }

}