// renderer.js

export class Renderer {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = gameState;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];
            if (obj.draw) obj.draw();
        }
    }
}