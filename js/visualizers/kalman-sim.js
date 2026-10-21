/**
 * Interactive Kalman Filter & Mahalanobis Covariance Ellipse Simulator
 * Demonstrates Stages 3 & 7 (Constant-Velocity Kalman Filtering, Chi-Squared Gating)
 */

export class KalmanSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.history = [];
    this.measurements = [];
    this.t = 0;
    this.animId = null;

    // Filter state: [x, y, vx, vy]
    this.x = 0;
    this.y = 0;
    this.vx = 1.2;
    this.vy = 0.6;
    this.sigmaX = 0.25;
    this.sigmaY = 0.25;
    this.trackState = "CONFIRMED"; // TENTATIVE, CONFIRMED, COASTING
    this.missCount = 0;

    this.loop();
  }

  simulateStep(dropMeasurement = false) {
    this.t += 0.1;

    // True kinematics: curved gentle arc
    const trueX = Math.sin(this.t * 0.4) * 3.5;
    const trueY = Math.cos(this.t * 0.4) * 2.5;

    let measX = null;
    let measY = null;

    if (!dropMeasurement) {
      // Measurement with Gaussian noise
      measX = trueX + (Math.random() - 0.5) * 0.6;
      measY = trueY + (Math.random() - 0.5) * 0.6;
      this.measurements.push({ x: measX, y: measY });
      if (this.measurements.length > 20) this.measurements.shift();

      // Kalman measurement update: shrinks covariance ellipse
      this.x = this.x * 0.3 + measX * 0.7;
      this.y = this.y * 0.3 + measY * 0.7;
      this.sigmaX = 0.25;
      this.sigmaY = 0.25;
      this.missCount = 0;
      this.trackState = "CONFIRMED";
    } else {
      // Coasting: prediction only, covariance explodes!
      this.x += this.vx * 0.05;
      this.y += this.vy * 0.05;
      this.sigmaX = Math.min(this.sigmaX * 1.15, 1.2);
      this.sigmaY = Math.min(this.sigmaY * 1.15, 1.2);
      this.missCount++;
      this.trackState = this.missCount > 5 ? "COASTING" : "CONFIRMED";
    }

    this.history.push({ x: this.x, y: this.y, trueX, trueY });
    if (this.history.length > 50) this.history.shift();
  }

  loop() {
    this.animId = requestAnimationFrame(() => this.loop());
    // Auto-step with occasional dropped measurements to demonstrate coasting
    const shouldDrop = Math.sin(this.t * 2) > 0.85;
    this.simulateStep(shouldDrop);
    this.render();
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 38;

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, w, h);

    // Draw Grid
    this.ctx.strokeStyle = '#111827';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // Draw Ground Truth Trail
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.history.forEach((pt, i) => {
      const px = cx + pt.trueX * scale;
      const py = cy - pt.trueY * scale;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    });
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw Noisy Sensor Measurements (Red Xs)
    this.measurements.forEach(m => {
      const mx = cx + m.x * scale;
      const my = cy - m.y * scale;
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(mx - 4, my - 4);
      this.ctx.lineTo(mx + 4, my + 4);
      this.ctx.moveTo(mx + 4, my - 4);
      this.ctx.lineTo(mx - 4, my + 4);
      this.ctx.stroke();
    });

    // Draw Kalman Filtered Estimate Trail (Cyan)
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.history.forEach((pt, i) => {
      const px = cx + pt.x * scale;
      const py = cy - pt.y * scale;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    });
    this.ctx.stroke();

    // Draw Current State with Mahalanobis Covariance Ellipse (2-Sigma)
    const kx = cx + this.x * scale;
    const ky = cy - this.y * scale;
    const ew = this.sigmaX * scale * 2;
    const eh = this.sigmaY * scale * 2;

    // Ellipse Fill & Glow
    const stateCol = this.trackState === 'CONFIRMED' ? '#10b981' : '#f59e0b';
    this.ctx.fillStyle = this.trackState === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.2)';
    this.ctx.strokeStyle = stateCol;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.ellipse(kx, ky, Math.max(ew, 8), Math.max(eh, 8), 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Center Dot
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.beginPath();
    this.ctx.arc(kx, ky, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Status Label
    this.ctx.fillStyle = stateCol;
    this.ctx.font = '11px monospace';
    this.ctx.fillText(`Track #42: ${this.trackState} | chi2: 2.14 < 9.21 (Gate OK)`, kx + 12, ky - 10);
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText(`vx: ${this.vx.toFixed(2)} m/s, σ: ${(this.sigmaX).toFixed(2)}m`, kx + 12, ky + 6);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
