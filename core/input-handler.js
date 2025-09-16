// input-handler.js

export class InputHandler {
    constructor(canvas, gameController) {
        this.canvas = canvas;
        this.gameController = gameController;
        this.canvas.addEventListener('mousedown', (event) => this.onCanvasClick(event));
        this.canvas.addEventListener('contextmenu', (event) => this.onCanvasRightClick(event));
    }

    onCanvasClick(event) {
        // Now, this handler only knows about the event.
        // It passes the data to the controller.
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        this.gameController.handleLeftClick(mouseX, mouseY);
    }
    
    onCanvasRightClick(event) {
        // Same as above, just passes data to the controller.
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        this.gameController.handleRightClick(mouseX, mouseY);
    }
}