/**
 * 3D LiDAR Point Cloud & Ground Segmentation Simulator (Stage 5)
 * Visualizes 16-beam Velodyne returns, RANSAC ground plane fitting, and 2D clustering
 */

export class LidarSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.filterGround = true;
    this.showClusters = true;
    this.clusterDist = 0.8;
    this.points = [];
    this.clusters = [];
    this.angle = 0;
    this.animId = null;

    this.generateScene();
    this.loop();
  }

  generateScene() {
    this.points = [];
    // Generate 16 rings of ground points
    for (let ring = 0; ring < 16; ring++) {
      const radius = 1.0 + ring * 1.1;
      const count = Math.floor(25 + ring * 12);
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        // Ground road surface near z=0 with slight curb step at y > 6
        let z = (Math.random() - 0.5) * 0.04;
        let isSidewalk = false;
        if (Math.sin(theta) * radius > 4.5) {
          z += 0.15; // 15 cm curb step!
          isSidewalk = true;
        }
        this.points.push({
          x: Math.cos(theta) * radius,
          y: Math.sin(theta) * radius,
          z: z,
          isGround: true,
          isSidewalk: isSidewalk
        });
      }
    }

    // Add Obstacle Clusters (e.g. Pedestrian, Car, Traffic Cone)
    const obstacles = [
      { cx: 3.2, cy: 1.8, count: 45, radius: 0.35, height: 1.7, type: 'pedestrian', color: '#ef4444' },
      { cx: -4.5, cy: 3.5, count: 90, radius: 1.1, height: 1.4, type: 'vehicle', color: '#10b981' },
      { cx: 1.5, cy: -3.0, count: 20, radius: 0.25, height: 0.6, type: 'cone', color: '#f59e0b' }
    ];

    obstacles.forEach((obs, idx) => {
      for (let i = 0; i < obs.count; i++) {
        const r = Math.random() * obs.radius;
        const a = Math.random() * Math.PI * 2;
        this.points.push({
          x: obs.cx + Math.cos(a) * r,
          y: obs.cy + Math.sin(a) * r,
          z: 0.2 + Math.random() * obs.height,
          isGround: false,
          clusterId: idx,
          color: obs.color,
          type: obs.type
        });
      }
    });
  }

  setGroundFilter(enabled) {
    this.filterGround = enabled;
  }

  setShowClusters(enabled) {
    this.showClusters = enabled;
  }

  loop() {
    this.animId = requestAnimationFrame(() => this.loop());
    this.angle += 0.004;
    this.render();
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 24;

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, w, h);

    // Draw coordinate grid rings
    this.ctx.lineWidth = 1;
    [2, 5, 8, 12].forEach(dist => {
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, dist * scale, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.fillStyle = '#475569';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(`${dist}m`, cx + dist * scale + 4, cy - 4);
    });

    // Draw LiDAR Center
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Render Points
    this.points.forEach(p => {
      if (this.filterGround && p.isGround) {
        // Render ground points dimly
        this.ctx.fillStyle = p.isSidewalk ? 'rgba(168, 85, 247, 0.25)' : 'rgba(16, 185, 129, 0.15)';
        this.ctx.fillRect(cx + p.x * scale - 1, cy - p.y * scale - 1, 2, 2);
      } else if (!p.isGround) {
        // Obstacle points
        this.ctx.fillStyle = p.color || '#38bdf8';
        this.ctx.beginPath();
        this.ctx.arc(cx + p.x * scale, cy - p.y * scale, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Raw unfiltered ground
        this.ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        this.ctx.fillRect(cx + p.x * scale - 1, cy - p.y * scale - 1, 2, 2);
      }
    });

    // Draw 2D Cluster Bounding Boxes if enabled
    if (this.showClusters) {
      const boxes = [
        { x: 3.2, y: 1.8, w: 0.8, h: 0.8, label: 'Pedestrian #14 (3.7m)', col: '#ef4444' },
        { x: -4.5, y: 3.5, w: 2.4, h: 1.8, label: 'Vehicle #08 (5.7m)', col: '#10b981' },
        { x: 1.5, y: -3.0, w: 0.6, h: 0.6, label: 'Obstacle #21 (3.3m)', col: '#f59e0b' }
      ];

      boxes.forEach(b => {
        const bx = cx + (b.x - b.w / 2) * scale;
        const by = cy - (b.y + b.h / 2) * scale;
        const bw = b.w * scale;
        const bh = b.h * scale;

        this.ctx.strokeStyle = b.col;
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(bx, by, bw, bh);

        this.ctx.fillStyle = b.col;
        this.ctx.font = '10px monospace';
        this.ctx.fillText(b.label, bx, by - 6);
      });
    }
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
