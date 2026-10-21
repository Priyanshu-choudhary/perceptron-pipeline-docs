/**
 * Animated Data Packet Flow Engine
 * Animates neon pulses and particle packets along topic lines connecting pipeline stages
 */

export class PacketFlowEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.packets = [];
    this.animId = null;

    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    this.spawnLoop();
    this.loop();
  }

  onResize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = 80;
  }

  spawnLoop() {
    setInterval(() => {
      // Spawn new packet at left side
      const colors = ['#00e5ff', '#10b981', '#6366f1', '#ec4899', '#f59e0b', '#3b82f6'];
      this.packets.push({
        x: 0,
        y: 40 + (Math.random() - 0.5) * 20,
        speed: 2.5 + Math.random() * 2.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: 3 + Math.random() * 2,
        tail: []
      });
    }, 280);
  }

  loop() {
    this.animId = requestAnimationFrame(() => this.loop());
    this.update();
    this.render();
  }

  update() {
    const w = this.canvas.width;
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      p.tail.unshift({ x: p.x, y: p.y });
      if (p.tail.length > 8) p.tail.pop();
      p.x += p.speed;

      if (p.x > w) {
        this.packets.splice(i, 1);
      }
    }
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    // Draw Central Topic Bus Spine
    this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 40);
    this.ctx.lineTo(w, 40);
    this.ctx.stroke();

    // Render Packets
    this.packets.forEach(p => {
      // Tail trail
      p.tail.forEach((t, ti) => {
        const alpha = (1 - ti / p.tail.length) * 0.4;
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, p.radius * (1 - ti / p.tail.length), 0, Math.PI * 2);
        this.ctx.fill();
      });

      // Packet Head
      this.ctx.globalAlpha = 1.0;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
