export class Radar {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        this.rotation = 0; // for scanning animation
        this.draw(); 
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Radar background
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.width / 2 - 2, 0, 2 * Math.PI);
        ctx.fill();

        // Center dot
        ctx.fillStyle = "#0f0";
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Rotating sweep line
        ctx.strokeStyle = "rgba(0,255,0,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        const angle = this.rotation * Math.PI / 180;
        const radius = this.width / 2 - 4;
        ctx.lineTo(
            this.centerX + radius * Math.cos(angle),
            this.centerY + radius * Math.sin(angle)
        );
        ctx.stroke();
    }

    animate() {
        this.rotation = (this.rotation + 1) % 360;
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}
