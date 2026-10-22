/**
 * Continuous Math-Rendered Animation Engine for Perceptron Pipeline Stages
 * Auto-running 60 FPS Canvas simulations representing exact robotics & mathematical models:
 * - No manual step buttons (continuous auto-run like a 3Blue1Brown/Manim math video)
 * - Exact mathematical representations: EKF covariance shrinkage, RANSAC plane,
 *   Pinhole projection, Mahalanobis gating, CTRV horizons, dynamic costmaps, MPPI rollouts
 */

export function mountStageStory(container, stage) {
  if (!container) return null;

  let animId = null;
  let t = 0;

  container.innerHTML = `
    <div class="math-story-card" style="--stage-accent: ${stage.color};">
      <div class="math-story-header">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <span class="math-story-dot" style="background: ${stage.color}; box-shadow: 0 0 10px ${stage.color};"></span>
            <span class="font-mono text-xs font-bold uppercase tracking-wider" style="color: ${stage.color};">
              Stage ${String(stage.num).padStart(2, '0')} Mathematical & Kinematic Model
            </span>
          </div>
          <span class="math-story-badge">
            Auto-Running Math Simulation (60 FPS)
          </span>
        </div>
      </div>

      <div class="math-story-canvas-box">
        <canvas id="math-stage-canvas" class="math-stage-canvas" width="960" height="340"></canvas>
      </div>

      <div class="math-story-footer font-mono text-xs text-slate-400">
        <span class="text-cyan-400">● Live Math Model:</span>
        <span id="math-story-caption" class="text-slate-300"></span>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#math-stage-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const captionEl = container.querySelector('#math-story-caption');

  // Math simulation renderer mapping
  function render(time) {
    t += 0.025;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Draw background grid
    ctx.strokeStyle = '#091322';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    switch (stage.num) {
      case 1:
        renderStage01(ctx, w, h, t, captionEl);
        break;
      case 2:
        renderStage02(ctx, w, h, t, captionEl);
        break;
      case 3:
        renderStage03(ctx, w, h, t, captionEl);
        break;
      case 4:
        renderStage04(ctx, w, h, t, captionEl);
        break;
      case 5:
        renderStage05(ctx, w, h, t, captionEl);
        break;
      case 6:
        renderStage06(ctx, w, h, t, captionEl);
        break;
      case 7:
        renderStage07(ctx, w, h, t, captionEl);
        break;
      case 8:
        renderStage08(ctx, w, h, t, captionEl);
        break;
      case 9:
        renderStage09(ctx, w, h, t, captionEl);
        break;
      case 10:
        renderStage10(ctx, w, h, t, captionEl);
        break;
      case 11:
        renderStage11(ctx, w, h, t, captionEl);
        break;
      case 12:
        renderStage12(ctx, w, h, t, captionEl);
        break;
      default:
        renderStage01(ctx, w, h, t, captionEl);
    }

    animId = requestAnimationFrame(render);
  }

  // Stage 1: LiDAR Radial Ray Sweep & IMU Gyro Rates
  function renderStage01(ctx, w, h, t, cap) {
    cap.textContent = `LiDAR Range Rays r(θ) = 0.5..50m • Gyro Body Rates ω_z(t) = ${(Math.sin(t*2)*0.8).toFixed(3)} rad/s • Accel z = +9.81 m/s²`;
    const cx = w * 0.35;
    const cy = h * 0.5;

    // 16-beam rotating radial LiDAR scan
    const sweepAngle = t * 3;
    for (let ring = 1; ring <= 16; ring++) {
      const radius = ring * 8;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 32; i++) {
      const a = sweepAngle + (i / 32) * Math.PI * 2;
      const len = 70 + Math.sin(a * 4 + t) * 35;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();

      // Return points
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * len, cy + Math.sin(a) * len, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // LiDAR Origin
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px monospace';
    ctx.fillText('Velodyne VLP-16 (10 Hz)', cx - 65, cy + 135);

    // Right Side: IMU Gyro Rate & Accel Waveforms
    const gx = w * 0.65;
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(gx - 40, cy - 100, 280, 200);

    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    ctx.fillText('Pixhack 6-DOF IMU Telemetry (100 Hz)', gx - 20, cy - 80);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < 240; x += 3) {
      const y = cy - 20 + Math.sin((x * 0.05) - t * 4) * 25;
      if (x === 0) ctx.moveTo(gx - 20 + x, y);
      else ctx.lineTo(gx - 20 + x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '10px monospace';
    ctx.fillText('ω_z (yaw rate)', gx - 20, cy + 20);

    // Accelerometer linear Z (gravity 9.81)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < 240; x += 3) {
      const y = cy + 60 + (Math.sin((x * 0.1) + t * 6) * 4);
      if (x === 0) ctx.moveTo(gx - 20 + x, y);
      else ctx.lineTo(gx - 20 + x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.fillText('a_z = +9.81 m/s² (1g)', gx - 20, cy + 85);
  }

  // Stage 2: Sliding-Window Clock Discipline
  function renderStage02(ctx, w, h, t, cap) {
    cap.textContent = `ZeroMQ Sliding-Window Offset: Δt_offset = min (t_recv - t_send) over W=3.0s • Transport delay eliminated without NTP`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Time delay scatter plot
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(cx - 320, cy - 100, 640, 200);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText('Wi-Fi Packet Latency (t_recv - t_send) [ms]', cx - 300, cy - 80);

    const points = [];
    const minLineY = cy + 40;

    for (let i = 0; i < 40; i++) {
      const px = cx - 300 + i * 15;
      const jitter = Math.abs(Math.sin(i * 1.3 + t * 2)) * 60 + Math.random() * 8;
      const py = minLineY - jitter;
      points.push({ px, py });

      // Jitter scatter points
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Min Convex Envelope Line (The True Offset)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 300, minLineY);
    ctx.lineTo(cx + 300, minLineY);
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px monospace';
    ctx.fillText('Minimum Latency Line (True Clock Offset Δt_offset)', cx - 180, minLineY + 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('Shaded region above = Wi-Fi Transport Delay τ ≥ 0 (Cleanly Removed)', cx - 200, cy - 45);
  }

  // Stage 3: Continuous EKF State Estimation & Covariance Shrinkage
  function renderStage03(ctx, w, h, t, cap) {
    const cycle = (t * 0.8) % 4;
    const isUpdate = cycle > 2.0;
    const sigma = isUpdate ? 0.35 + (3.9 - cycle) * 0.2 : 0.75 + cycle * 0.25;

    cap.textContent = `Continuous EKF: P_k = (I - KH) P_k|k-1 • Covariance det(P) = ${(sigma * sigma).toFixed(4)} • State: [x, y, vx, vy, yaw, gyro]`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Moving ground truth trajectory
    const tx = Math.sin(t * 0.5) * 160;
    const ty = Math.cos(t * 0.5) * 50;

    // Trail
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const px = cx + Math.sin(a) * 160;
      const py = cy + Math.cos(a) * 50;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Robot True Position
    const rx = cx + tx;
    const ry = cy + ty;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
    ctx.fill();

    // Covariance Ellipse (Shrinking on measurement, expanding on coasting)
    const ew = sigma * 90;
    const eh = sigma * 45;

    ctx.fillStyle = isUpdate ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
    ctx.strokeStyle = isUpdate ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(rx, ry, ew, eh, t * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Live Math Formula Display
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText('P_k|k = [I - K_k H] P_k|k-1', cx - 360, cy - 90);
    ctx.fillStyle = isUpdate ? '#34d399' : '#fbbf24';
    ctx.fillText(isUpdate ? 'MEASUREMENT UPDATE (P Contracts)' : 'PREDICTION STEP (P Expands)', cx - 360, cy - 70);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`Kalman Gain K = [ ${(0.65).toFixed(2)}, ${(0.32).toFixed(2)} ]`, cx - 360, cy - 50);
    ctx.fillText(`Estimated State: x=${(tx*0.01).toFixed(2)}m, y=${(ty*0.01).toFixed(2)}m`, cx - 360, cy - 30);
  }

  // Stage 4: AMCL Monte Carlo Particle Filter
  function renderStage04(ctx, w, h, t, cap) {
    cap.textContent = `AMCL Particle Filter: 240 Beams Likelihood Field p(z|x,m) • 500 Resampled Particles Converging on True Pose`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Room boundaries
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 240, cy - 110, 480, 220);

    // True robot pose
    const rx = cx - 40 + Math.sin(t * 0.4) * 80;
    const ry = cy + Math.cos(t * 0.4) * 40;

    // Particles cloud (KLD adaptive particles)
    const particleSpread = Math.max(12, 60 - ((t * 8) % 60));
    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2;
      const dist = (Math.sin(i * 99) * 0.5 + 0.5) * particleSpread;
      const px = rx + Math.cos(angle) * dist;
      const py = ry + Math.sin(angle) * dist;

      ctx.fillStyle = 'rgba(99, 102, 241, 0.7)';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Laser rays cast from estimated pose
    for (let b = 0; b < 16; b++) {
      const beamAngle = (b / 16) * Math.PI * 2 + t * 0.5;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(beamAngle) * 90, ry + Math.sin(beamAngle) * 90);
      ctx.stroke();
    }

    // Robot center
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e0e7ff';
    ctx.font = '11px monospace';
    ctx.fillText('AMCL KLD Convergence: Particles Clustered', cx - 220, cy - 85);
  }

  // Stage 5: 3D LiDAR Preprocessing (RANSAC Ground Plane)
  function renderStage05(ctx, w, h, t, cap) {
    cap.textContent = `RANSAC Ground Plane: |ax + by + cz + d| < 0.06m • Tilt = ${(0.12).toFixed(2)}° • 2D KD-Tree Cluster Extraction`;
    const cx = w * 0.5;
    const cy = h * 0.5 + 40;

    // Ground Plane Surface Line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 320, cy);
    ctx.lineTo(cx + 320, cy);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    ctx.fillText('Fitted RANSAC Road Plane (z = 0, tilt ≈ 0°)', cx - 140, cy + 24);

    // Raised Sidewalk Step (+15cm)
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 120, cy - 25);
    ctx.lineTo(cx + 320, cy - 25);
    ctx.stroke();
    ctx.fillText('Curb Step +15cm (Height Grid)', cx + 130, cy - 35);

    // Points Falling & Color Coded
    for (let i = -30; i <= 30; i++) {
      const px = cx + i * 10;
      let py = cy + (Math.sin(i * 12 + t * 5) * 3);
      let isGround = true;

      // Obstacle 1 (Pedestrian box at x = -100)
      if (i >= -14 && i <= -6) {
        py = cy - 20 - Math.random() * 70;
        isGround = false;
      }
      // Obstacle 2 (Vehicle box at x = 40)
      if (i >= 2 && i <= 10) {
        py = cy - 15 - Math.random() * 50;
        isGround = false;
      }

      ctx.fillStyle = isGround ? 'rgba(16, 185, 129, 0.6)' : '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, isGround ? 2.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2D Cluster Bounding Boxes
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 145, cy - 95, 85, 95);
    ctx.strokeRect(cx + 15, cy - 70, 90, 70);

    ctx.fillStyle = '#ef4444';
    ctx.font = '10px monospace';
    ctx.fillText('Cluster #1: Pedestrian (3.8m)', cx - 145, cy - 102);
    ctx.fillText('Cluster #2: Vehicle (5.2m)', cx + 15, cy - 77);
  }

  // Stage 6: Camera-LiDAR Sensor Fusion
  function renderStage06(ctx, w, h, t, cap) {
    cap.textContent = `Pinhole Camera Projection: [u, v]^T = K [R|t] [X, Y, Z]^T • Hungarian IoU Matching Score = 0.87`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Simulated 2D Camera Frame
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 260, cy - 110, 520, 220);

    // 2D Camera Box from YOLO
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 80, cy - 60, 160, 140);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText('2D Detection: [car, score=0.94]', cx - 80, cy - 68);

    // Projected 3D LiDAR Points onto 2D image
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 8; y++) {
        const px = cx - 65 + x * 13 + (Math.sin(t * 3 + x) * 2);
        const py = cy - 45 + y * 14 + (Math.cos(t * 3 + y) * 2);
        const depth = 4.2 + (y * 0.1);

        // Color by depth
        ctx.fillStyle = `hsl(${200 + y * 10}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#ec4899';
    ctx.font = '11px monospace';
    ctx.fillText('3D LiDAR Points Fused: Depth = 4.35m to Nearest Surface', cx - 180, cy + 95);
  }

  // Stage 7: Multi-Object Tracking & Mahalanobis Gate
  function renderStage07(ctx, w, h, t, cap) {
    const dM2 = 2.14 + Math.sin(t * 2) * 1.5;
    cap.textContent = `Kalman Tracking: Chi-Squared Gate d_M² = ${dM2.toFixed(2)} ≤ 9.21 (p=0.99) • State Machine: CONFIRMED • Track #14`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Mahalanobis 99% Gating Ellipse (chi2 = 9.21)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 140, 75, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px monospace';
    ctx.fillText('Mahalanobis Gate Boundary (χ² ≤ 9.21)', cx - 110, cy - 85);

    // Moving detection inside gate
    const detX = cx + Math.sin(t * 3) * 60;
    const detY = cy + Math.cos(t * 3) * 30;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(detX, detY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Velocity arrow
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(detX, detY);
    ctx.lineTo(detX + 45, detY - 15);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    ctx.fillText('Track #14 (CONFIRMED) v = 1.34 m/s', detX - 60, detY + 24);
  }

  // Stage 8: Trajectory Prediction (CTRV & CV Horizons)
  function renderStage08(ctx, w, h, t, cap) {
    cap.textContent = `CTRV Trajectory Prediction: Horizons t = [0.5s, 1.0s, 2.0s] • Covariance Expansion Σ(t) = F(t) P F(t)^T + Q(t)`;
    const cx = w * 0.35;
    const cy = h * 0.6;

    // Moving Vehicle
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 15, cy - 10, 30, 20);

    // Multi-horizon curved ribbon (CTRV)
    const horizons = [0.5, 1.0, 2.0];
    const pts = [];
    const v = 3.2;
    const wTurn = 0.4;

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    for (let dt = 0; dt <= 2.0; dt += 0.05) {
      const theta = wTurn * dt;
      const px = cx + (v / wTurn) * Math.sin(theta) * 35;
      const py = cy - (v / wTurn) * (1 - Math.cos(theta)) * 35;
      if (dt === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      if (horizons.some(hz => Math.abs(hz - dt) < 0.03)) pts.push({ px, py, dt });
    }
    ctx.stroke();

    // Horizon Marker Circles
    pts.forEach(p => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(p.px, p.py, 5, 0, Math.PI * 2);
      ctx.fill();

      // Expanding Covariance Ring
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 10 + p.dt * 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(`t = +${p.dt.toFixed(1)}s`, p.px + 12, p.py - 6);
    });

    ctx.fillStyle = '#f87171';
    ctx.font = '11px monospace';
    ctx.fillText('CTRV Non-Linear Turning Trajectory', cx - 80, cy + 40);
  }

  // Stage 9: Dynamic 3D-Aware Costmap & Vision Road Layer
  function renderStage09(ctx, w, h, t, cap) {
    cap.textContent = `Dynamic Costmap & Road Layer: /costmap/nav (Voxels + Risk Ribbons) & /perception/road_costmap (Road 0, Line 30, Off-road 254)`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Vision Road Corridor from road_segmentation_node
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.fillRect(cx - 300, cy - 90, 600, 180);

    // Off-road lethal borders (sidewalk/curb, 254)
    ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
    ctx.fillRect(cx - 300, cy - 130, 600, 40);
    ctx.fillRect(cx - 300, cy + 90, 600, 40);

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 300, cy - 90); ctx.lineTo(cx + 300, cy - 90);
    ctx.moveTo(cx - 300, cy + 90); ctx.lineTo(cx + 300, cy + 90);
    ctx.stroke();

    // Center lane marking (orange dashed line, cost 30)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(cx - 300, cy); ctx.lineTo(cx + 300, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ego Robot Footprint
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(cx - 20, cy - 15, 40, 30);
    ctx.strokeStyle = '#00e5ff';
    ctx.strokeRect(cx - 35, cy - 25, 70, 50);

    // Dynamic obstacle moving with risk corridor
    const obsX = cx + 80 + Math.sin(t * 2) * 50;
    const obsY = cy - 45;

    // Layer 3: Risk Corridor Ribbon (Time-to-encounter weighted)
    const g = ctx.createLinearGradient(obsX, obsY, obsX - 90, obsY);
    g.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
    g.addColorStop(0.6, 'rgba(245, 158, 11, 0.45)');
    g.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    ctx.fillStyle = g;
    ctx.fillRect(obsX - 90, obsY - 18, 90, 36);

    // Layer 1: Raw Lethal Obstacle (Published directly on /costmap/nav)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(obsX, obsY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2: Nav2 Footprint Inflation Boundary
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(obsX, obsY, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#14b8a6';
    ctx.font = '11px monospace';
    ctx.fillText('/perception/road_costmap: Road (0), Line (30), Off-road (254)', cx - 280, cy - 100);
    ctx.fillText('/costmap/nav: Lethal Voxels + Dynamic Risk Ribbons', cx - 210, cy + 75);
  }

  // Stage 10: Nav2 Planning, MPPI Controller & Predictive Yielding
  function renderStage10(ctx, w, h, t, cap) {
    const isYielding = Math.sin(t * 1.5) > 0.1;
    const speed = isYielding ? 0.0 : 4.5;
    cap.textContent = `Nav2 Smac Hybrid-A* (Dubins r=3.0m) • MPPI Controller (800 Rollouts, Ackermann r=2.2m, v=${speed.toFixed(1)} m/s) • Collision Monitor (1.3m / 5.0m) • Predictive Yield: ${isYielding ? 'YIELDING (/speed_limit = 0)' : 'CRUISING'}`;
    const cx = w * 0.30;
    const cy = h * 0.52;

    // Road Route Guide (White dashed, starting ahead of the car)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy + 35);
    ctx.bezierCurveTo(cx + 40, cy + 35, cx + 90, cy - 30, cx + 240, cy - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // MPPI Stochastic Rollout Bundle (800 Trajectory Samples Fan)
    for (let r = 0; r < 14; r++) {
      const spread = (r - 7) * 4.5;
      const noise = Math.sin(t * 3 + r) * 3;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + 24, cy + 35);
      ctx.bezierCurveTo(cx + 70, cy + 35 + spread * 0.4, cx + 110, cy - 25 + spread + noise, cx + 230, cy - 30 + spread * 0.8);
      ctx.stroke();
    }

    // Optimal MPPI Selected Trajectory (Bold Glowing Emerald)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx + 24, cy + 35);
    ctx.bezierCurveTo(cx + 60, cy + 35, cx + 100, cy - 28, cx + 240, cy - 30);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ego Vehicle (Microlino / Rover Body)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cx - 24, cy + 22, 48, 26);

    // Collision Monitor Stop Polygon (1.3m ahead - Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 24, cy + 24, 26, 22);

    // Collision Monitor Slow Polygon (5.0m ahead - Orange)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(cx + 24, cy + 18, 65, 34);
    ctx.setLineDash([]);

    // Crossing Pedestrian with Predictive Yield Corridor
    const pedX = cx + 95;
    const pedY = isYielding ? cy - 5 : cy - 70;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(pedX, pedY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.font = '10px monospace';
    ctx.fillText('MPPI Optimal Rollout (800 batch, 8 critics)', cx + 50, cy - 42);
    ctx.font = '10px monospace';
    ctx.fillText('Walker Crossing', pedX - 15, pedY - 12);

    if (isYielding) {
      // Yield barrier marker
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 50, cy + 15);
      ctx.lineTo(cx + 50, cy + 55);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillText('STOP (1.5m Gap)', cx + 40, cy + 70);
    }
  }

  // Stage 11: Actuator Output & Vehicle Control (Ackermann & Speed PI)
  function renderStage11(ctx, w, h, t, cap) {
    const vx = 2.4;
    const kappa = Math.sin(t * 1.8) * 0.28; // curvature w / v
    const L = 1.525; // Microlino wheelbase
    const deltaRad = Math.atan(L * kappa);
    const deltaDeg = deltaRad * (180 / Math.PI);
    const throttle = 0.38 + Math.max(0, Math.sin(t * 2)) * 0.15;

    cap.textContent = `Ackermann Steering: δ = atan(L·κ) = ${deltaDeg.toFixed(1)}° • Speed PI: Throttle ${(throttle * 100).toFixed(0)}% • Watchdog: 0.12s < 0.5s • Collision Sensor: CLEAR`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Vehicle Chassis
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 65, cy - 35, 130, 70);

    // Rear Wheels (Fixed straight)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 72, cy - 42, 22, 12);
    ctx.fillRect(cx - 72, cy + 30, 22, 12);

    // Front Wheels (Steering by deltaDeg)
    const renderSteerWheel = (wx, wy) => {
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(deltaRad);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-11, -6, 22, 12);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(-11, -6, 22, 12);
      ctx.restore();
    };

    renderSteerWheel(cx + 50, cy - 36);
    renderSteerWheel(cx + 50, cy + 36);

    // Front Bumper / Collision Sensor Bar
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 65, cy - 30);
    ctx.lineTo(cx + 65, cy + 30);
    ctx.stroke();

    // HUD Info
    ctx.fillStyle = '#22c55e';
    ctx.font = '11px monospace';
    ctx.fillText(`Ackermann Steer δ: ${deltaDeg.toFixed(1)}° (Max ±35°)`, cx - 110, cy + 65);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Speed PI Loop: vx = ${vx.toFixed(1)} m/s (Throttle: ${(throttle * 100).toFixed(0)}%)`, cx - 130, cy - 55);
  }

  // Stage 12: Telemetry & Augmented Path Video Reprojection
  function renderStage12(ctx, w, h, t, cap) {
    cap.textContent = `AR Camera Reprojection: /plan → ZMQ :5558 → Jetson GPU nvv4l2h265enc → RTP/UDP :5000 Live 30 FPS Stream`;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Perspective Camera View (Road with vanishing point)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 240, cy - 100, 480, 200);

    // Perspective Road Markings
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 160, cy + 100);
    ctx.lineTo(cx, cy - 40);
    ctx.moveTo(cx + 160, cy + 100);
    ctx.lineTo(cx, cy - 40);
    ctx.stroke();

    // Projected Augmented Path Ribbon (Glowing Green Carpet)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 100);
    ctx.lineTo(cx - 8, cy - 30);
    ctx.lineTo(cx + 8, cy - 30);
    ctx.lineTo(cx + 50, cy + 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = '11px monospace';
    ctx.fillText('Augmented AR Planned Path Ribbon (Camera Optical Frame)', cx - 160, cy + 70);
  }

  // Start Animation Loop
  animId = requestAnimationFrame(render);

  return {
    destroy() {
      if (animId) cancelAnimationFrame(animId);
      container.innerHTML = '';
    }
  };
}
