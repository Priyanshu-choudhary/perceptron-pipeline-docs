/**
 * Trajectory Prediction Horizon & Ribbon Simulator (Stage 8)
 * Demonstrates Constant Velocity (CV) and Constant Turn Rate Velocity (CTRV) models
 */

export class PredictionSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.horizonTime = 2.0; // 0.5s, 1.0s, 2.0s
    this.modelType = 'CTRV'; // CV vs CTRV
    this.animId = null;
    this.t = 0;

    this.loop();
  }

  setHorizon(val) {
    this.horizonTime = parseFloat(val);
  }

  setModel(type) {
    this.modelType = type;
  }

  loop() {
    this.animId = requestAnimationFrame(() => this.loop());
    this.t += 0.02;
    this.render();
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 40;
    const scale = 32;

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, w, h);

    // Draw Crossroad Road Surface
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(cx - 100, 0, 200, h);
    this.ctx.fillRect(0, cy - 80, w, 160);

    // Road Markings
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([12, 12]);
    this.ctx.beginPath();
    this.ctx.moveTo(cx, 0);
    this.ctx.lineTo(cx, h);
    this.ctx.moveTo(0, cy);
    this.ctx.lineTo(w, cy);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Ego Robot Position
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy + 80, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('Ego Rover', cx - 24, cy + 102);

    // Dynamic Crossing Pedestrian (Constant Velocity)
    const pedX = cx - 120 + ((this.t * 20) % 240);
    const pedY = cy - 40;
    this.renderPedestrianTrack(pedX, pedY);

    // Dynamic Turning Vehicle (CTRV)
    const vehAngle = (this.t * 0.4) % (Math.PI * 2);
    const vehX = cx + 80 + Math.cos(vehAngle) * 50;
    const vehY = cy - 20 + Math.sin(vehAngle) * 40;
    this.renderVehicleTrack(vehX, vehY, vehAngle + Math.PI / 2);
  }

  renderPedestrianTrack(x, y) {
    // Current Pedestrian Box
    this.ctx.fillStyle = '#ef4444';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Projected Path Ribbon (CV model, dt=0.1s up to horizonTime)
    const steps = Math.floor(this.horizonTime / 0.1);
    const vx = 1.2 * 20; // 1.2 m/s scaled

    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 6);
    this.ctx.lineTo(x + vx * this.horizonTime, y - 6 - this.horizonTime * 4);
    this.ctx.lineTo(x + vx * this.horizonTime, y + 6 + this.horizonTime * 4);
    this.ctx.lineTo(x, y + 6);
    this.ctx.closePath();
    this.ctx.fill();

    // Dense Waypoints & Horizon Marks
    [0.5, 1.0, 2.0].forEach(h => {
      if (h <= this.horizonTime) {
        const hx = x + vx * h;
        const hy = y;
        this.ctx.fillStyle = '#f87171';
        this.ctx.beginPath();
        this.ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = '9px monospace';
        this.ctx.fillText(`${h}s`, hx - 6, hy - 10);
      }
    });

    this.ctx.fillStyle = '#ef4444';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('Pedestrian [CV: 1.2 m/s]', x - 30, y + 20);
  }

  renderVehicleTrack(x, y, heading) {
    // Current Vehicle Box
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(heading);
    this.ctx.fillStyle = '#10b981';
    this.ctx.fillRect(-14, -8, 28, 16);
    this.ctx.restore();

    // CTRV Curved Ribbon
    const v = 3.5;
    const w = 0.35;
    const ribbonPts = [];

    for (let t = 0; t <= this.horizonTime; t += 0.1) {
      const theta = heading + w * t;
      const rx = x + (v / w) * (Math.sin(theta) - Math.sin(heading)) * 8;
      const ry = y - (v / w) * (-Math.cos(theta) + Math.cos(heading)) * 8;
      ribbonPts.push({ x: rx, y: ry, t });
    }

    if (ribbonPts.length > 1) {
      this.ctx.strokeStyle = '#10b981';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      ribbonPts.forEach((pt, i) => {
        if (i === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();

      // Horizon covariance circles
      [0.5, 1.0, 2.0].forEach(h => {
        const pt = ribbonPts.find(p => Math.abs(p.t - h) < 0.05);
        if (pt && h <= this.horizonTime) {
          this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, 8 + h * 6, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.fillStyle = '#cbd5e1';
          this.ctx.font = '9px monospace';
          this.ctx.fillText(`${h}s CTRV`, pt.x + 8, pt.y - 6);
        }
      });
    }
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
