/**
 * 3D-Aware Dynamic Costmap Layer Simulator (Stage 9)
 * Demonstrates Layer 1 (Voxels), Layer 2 (Inflation), Layer 3 (Dynamic Risk Ribbons) and Combined Max-Pool
 */

export class CostmapSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.showVoxels = true;
    this.showInflation = true;
    this.showDynamicRisk = true;
    this.t = 0;
    this.animId = null;

    this.loop();
  }

  setLayers({ voxels, inflation, dynamicRisk }) {
    if (voxels !== undefined) this.showVoxels = voxels;
    if (inflation !== undefined) this.showInflation = inflation;
    if (dynamicRisk !== undefined) this.showDynamicRisk = dynamicRisk;
  }

  loop() {
    this.animId = requestAnimationFrame(() => this.loop());
    this.t += 0.03;
    this.render();
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const res = 12; // Grid cell size in pixels

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, w, h);

    // Dynamic pedestrian moving across road
    const pedX = cx - 80 + Math.sin(this.t) * 90;
    const pedY = cy - 40;

    // Static wall obstacles
    const staticObstacles = [
      { x: cx + 70, y: cy + 40, r: 24 },
      { x: cx - 90, y: cy + 60, r: 28 },
      { x: cx + 110, y: cy - 70, r: 20 }
    ];

    // 1. Draw Layer 3: Dynamic Risk Ribbons (if enabled)
    if (this.showDynamicRisk) {
      const vx = Math.cos(this.t) * 50;
      const vy = 0;

      // Draw forward projected danger corridor
      const grad = this.ctx.createLinearGradient(pedX, pedY, pedX + vx * 2, pedY);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.7)'); // Lethal at encounter point
      grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.ellipse(pedX + vx, pedY, Math.abs(vx) + 20, 22, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ef4444';
      this.ctx.font = '10px monospace';
      this.ctx.fillText('Dynamic Risk Ribbon (t=0..2s)', pedX - 40, pedY - 26);
    }

    // 2. Draw Layer 2: Inscribed & Exponential Cost Inflation (if enabled)
    if (this.showInflation) {
      staticObstacles.forEach(obs => {
        // Outer inflation gradient
        const g = this.ctx.createRadialGradient(obs.x, obs.y, obs.r, obs.x, obs.y, obs.r + 45);
        g.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
        g.addColorStop(0.4, 'rgba(56, 189, 248, 0.2)');
        g.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(obs.x, obs.y, obs.r + 45, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    // 3. Draw Layer 1: Voxel Height Obstacles (Lethal Core) (if enabled)
    if (this.showVoxels) {
      // Pedestrian obstacle core
      this.ctx.fillStyle = '#ef4444';
      this.ctx.beginPath();
      this.ctx.arc(pedX, pedY, 12, 0, Math.PI * 2);
      this.ctx.fill();

      // Static obstacle cores
      staticObstacles.forEach(obs => {
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.beginPath();
        this.ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    // Robot Ego Footprint at center
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(cx - 15, cy + 50, 30, 40);

    // Circumscribed radius circle (0.33m)
    this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy + 70, 28, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = '#00e5ff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('Ego Robot (r=0.33m)', cx - 50, cy + 115);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
