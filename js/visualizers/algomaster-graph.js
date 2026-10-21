/**
 * AlgoMaster Top-to-Bottom Giant Graph Visualizer
 * Inspired by AlgoMaster educational animations:
 * - Pure top-to-bottom vertical DAG hierarchy
 * - Sleek dark containers with glowing cyan rounded borders
 * - Neon rounded pills/capsules for nodes
 * - Smooth vertical cubic bezier wires with luminous animated beads flowing downwards
 * - Informative bottom captions for each cluster ("all 3 observers notified")
 */

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export function mountAlgoMasterGraph(container, stages, connections, onSelectStage) {
  if (!container) return null;

  let animSpeed = 1.0;
  let isPaused = false;
  let activeFilter = 'all'; // 'all', 'perception', 'navigation', 'localization'
  let selectedNode = null;
  let resizeObserver = null;

  container.innerHTML = `
    <div class="algomaster-shell">
      <!-- Toolbar -->
      <div class="algomaster-toolbar">
        <div class="flex items-center gap-3">
          <span class="algomaster-tag">ALGOMASTER GRAPH</span>
          <h3 class="text-base font-bold text-white tracking-wide">Top-to-Bottom End-to-End System DAG</h3>
          <span class="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
            12 Stages • Vertical Flow
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Filter Buttons -->
          <div class="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center text-[11px] font-mono">
            <button type="button" class="algo-filter-btn px-2.5 py-1 rounded text-cyan-300 bg-cyan-950/80 border border-cyan-500/40" data-filter="all">All</button>
            <button type="button" class="algo-filter-btn px-2.5 py-1 rounded text-slate-400 hover:text-white" data-filter="perception">Perception</button>
            <button type="button" class="algo-filter-btn px-2.5 py-1 rounded text-slate-400 hover:text-white" data-filter="navigation">Navigation</button>
            <button type="button" class="algo-filter-btn px-2.5 py-1 rounded text-slate-400 hover:text-white" data-filter="localization">Localization</button>
          </div>

          <!-- Speed Controls -->
          <div class="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center text-[11px] font-mono">
            <button type="button" class="algo-speed-btn px-2 py-1 rounded text-slate-400 hover:text-white" data-speed="0.5">0.5x</button>
            <button type="button" class="algo-speed-btn px-2 py-1 rounded text-cyan-300 bg-cyan-950/80" data-speed="1.0">1x</button>
            <button type="button" class="algo-speed-btn px-2 py-1 rounded text-slate-400 hover:text-white" data-speed="2.0">2x</button>
          </div>

          <!-- Play/Pause -->
          <button type="button" class="algo-ctrl-btn px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 hover:border-cyan-400 flex items-center gap-1.5" data-action="toggle-play">
            <span id="algo-play-icon">⏸</span>
            <span id="algo-play-text">Pause Flow</span>
          </button>
        </div>
      </div>

      <!-- Graph Canvas Container -->
      <div class="algomaster-viewport" id="algomaster-viewport">
        <div class="algomaster-canvas" id="algomaster-canvas">
          <!-- SVG Connecting Wires Layer -->
          <svg class="algomaster-svg-layer" id="algomaster-svg"></svg>

          <!-- Vertical Tiers of Stages & Nodes -->
          <div class="algomaster-tiers" id="algomaster-tiers">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>

      <!-- Footer Info Bar -->
      <div class="algomaster-footer">
        <div class="flex items-center gap-2 text-xs font-mono text-slate-400" id="algomaster-status">
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Click any node to inspect parameters, topics, and source implementation.</span>
        </div>
        <div class="text-[11px] font-mono text-slate-500">
          AlgoMaster Style Flow • Continuous ROS 2 Topics Dispatched
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#algomaster-canvas');
  const svg = container.querySelector('#algomaster-svg');
  const tiersContainer = container.querySelector('#algomaster-tiers');
  const statusEl = container.querySelector('#algomaster-status');

  // Custom captions for each stage in AlgoMaster style
  const STAGE_CAPTIONS = {
    1: "5 sensor streams capturing raw spatial geometry, IMU body rates & wheel ticks",
    2: "sliding-window clock discipline removes Wi-Fi jitter & synchronizes CARLA/hardware",
    3: "15-state EKF odometry fused at 30 Hz (twist vx + gyro wz)",
    4: "global map transform (map -> odom) established via AMCL / SLAM",
    5: "16-beam Velodyne cloud separated into ground & 3D obstacle clusters",
    6: "2D YOLO bounding boxes fused with 3D LiDAR clusters via Hungarian IoU",
    7: "all dynamic tracks maintained via constant-velocity Kalman filter (χ² ≤ 9.21)",
    8: "CV & CTRV motion paths predicted at 0.5s, 1.0s, and 2.0s horizons",
    9: "3D voxel obstacles + dynamic risk ribbons max-pooled into unified costmap",
    10: "collision-free path planned & Twist velocity setpoints commanded",
    11: "PID closed-loop velocity setpoints dispatched to 4 skid-steer wheels",
    12: "augmented AR path ribbon rendered on live Jetson H.265 video stream"
  };

  // Render all 12 stages vertically
  function renderTiers() {
    tiersContainer.innerHTML = stages.map(stage => {
      const caption = STAGE_CAPTIONS[stage.num] || stage.summary;

      // Group nodes into parent/middle/children if available, or list them cleanly
      return `
        <div class="algomaster-card" data-stage="${stage.num}" id="algo-stage-${stage.num}" style="--stage-accent: ${stage.color};">
          <!-- Card Header (AlgoMaster style: • STAGE) -->
          <div class="algomaster-card-header">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <span class="algomaster-dot" style="background: ${stage.color}; box-shadow: 0 0 10px ${stage.color};"></span>
                <span class="algomaster-stage-title font-mono font-bold tracking-wider text-xs uppercase" style="color: ${stage.color};">
                  STAGE ${String(stage.num).padStart(2, '0')}: ${stage.title}
                </span>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                ${stage.badge}
              </span>
            </div>
          </div>

          <!-- Nodes Block -->
          <div class="algomaster-nodes-container">
            <!-- Node Pills -->
            <div class="flex flex-wrap items-center justify-center gap-3 py-2">
              ${stage.nodes.map((node, nIdx) => `
                <div class="algomaster-pill" 
                     data-node-name="${escapeHtml(node.name)}" 
                     data-stage-num="${stage.num}"
                     id="algo-node-${stage.num}-${nIdx}">
                  <span class="algomaster-pill-dot" style="background: ${stage.color};"></span>
                  <span class="algomaster-pill-name font-mono text-xs font-semibold text-white">${escapeHtml(node.name)}</span>
                  <span class="algomaster-pill-type text-[9px] font-mono text-cyan-300/80 bg-cyan-950/60 px-1.5 py-0.5 rounded">${escapeHtml(node.type || 'ROS Node')}</span>
                </div>
              `).join('')}
            </div>

            <!-- Key Topics Strip -->
            ${stage.outputs?.length ? `
              <div class="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800/80 mt-2">
                ${stage.outputs.slice(0, 3).map((out, outIdx) => `
                  <div class="algomaster-topic-chip" id="algo-topic-${stage.num}-${outIdx}">
                    <span class="text-[9px] text-slate-400 font-mono">PUB:</span>
                    <code class="text-[10px] text-cyan-300 font-mono font-bold">${escapeHtml(out.topic)}</code>
                    <span class="text-[9px] text-emerald-400 font-mono font-semibold">${escapeHtml(out.rate || '10 Hz')}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- AlgoMaster Bottom Caption -->
          <div class="algomaster-card-caption">
            <span class="text-cyan-400 font-mono text-xs">●</span>
            <span class="font-mono text-xs text-cyan-200/90">${escapeHtml(caption)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Draw smooth SVG bezier wires connecting stages from top to bottom
  function drawWires() {
    if (!svg || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const svgWidth = canvas.scrollWidth;
    const svgHeight = canvas.scrollHeight;

    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    let pathsHtml = '';

    connections.forEach((conn, idx) => {
      // Check filter
      if (activeFilter === 'perception' && ![1, 2, 5, 6, 7, 8, 9].includes(conn.fromStage)) return;
      if (activeFilter === 'navigation' && ![1, 2, 4, 9, 10, 11].includes(conn.fromStage)) return;
      if (activeFilter === 'localization' && ![1, 2, 3, 4, 10].includes(conn.fromStage)) return;

      const fromCard = container.querySelector(`#algo-stage-${conn.fromStage}`);
      const toCard = container.querySelector(`#algo-stage-${conn.toStage}`);
      if (!fromCard || !toCard) return;

      const fromRect = fromCard.getBoundingClientRect();
      const toRect = toCard.getBoundingClientRect();

      // Start at bottom of fromCard, end at top of toCard
      const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
      const y1 = fromRect.bottom - canvasRect.top;
      const x2 = toRect.left + toRect.width / 2 - canvasRect.left;
      const y2 = toRect.top - canvasRect.top;

      // Vertical cubic bezier curve
      const deltaY = y2 - y1;
      const cp1Y = y1 + deltaY * 0.45;
      const cp2Y = y2 - deltaY * 0.45;
      const d = `M ${x1} ${y1} C ${x1} ${cp1Y}, ${x2} ${cp2Y}, ${x2} ${y2}`;

      // Animation duration based on distance and speed
      const baseDuration = Math.max(1.8, Math.min(4.5, (conn.toStage - conn.fromStage) * 1.5)) / animSpeed;

      const fromStageObj = stages.find(s => s.num === conn.fromStage);
      const wireColor = fromStageObj?.color || '#00e5ff';

      pathsHtml += `
        <g class="algomaster-wire-group" data-wire-id="wire-${idx}" data-from="${conn.fromStage}" data-to="${conn.toStage}">
          <!-- Background glow wire -->
          <path class="algomaster-wire-glow" d="${d}" style="stroke: ${wireColor};"></path>
          
          <!-- Core sharp wire -->
          <path class="algomaster-wire-core" d="${d}" style="stroke: ${wireColor};"></path>
          
          <!-- Midpoint Topic Badge -->
          <circle cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="3" fill="${wireColor}"></circle>

          <!-- AlgoMaster Glowing Animated Bead running downwards -->
          <circle class="algomaster-animated-bead" r="4.5" fill="#ffffff" stroke="${wireColor}" stroke-width="2">
            <animateMotion dur="${baseDuration}s" repeatCount="indefinite" path="${d}" />
          </circle>
        </g>
      `;
    });

    svg.innerHTML = `
      <defs>
        <filter id="algoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      ${pathsHtml}
    `;
  }

  // Bind clicks and controls
  function bindEvents() {
    // Stage Card click -> Open detail
    container.querySelectorAll('.algomaster-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const stageNum = parseInt(card.dataset.stage);
        const stage = stages.find(s => s.num === stageNum);
        if (stage) onSelectStage?.(stage);
      });
    });

    // Node Pill click -> Highlight node and show status
    container.querySelectorAll('.algomaster-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeName = pill.dataset.nodeName;
        const stageNum = parseInt(pill.dataset.stageNum);

        container.querySelectorAll('.algomaster-pill').forEach(p => p.classList.remove('is-selected'));
        pill.classList.add('is-selected');

        selectedNode = nodeName;
        if (statusEl) {
          statusEl.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="text-white font-bold font-mono">${escapeHtml(nodeName)}</span>
            <span class="text-slate-400 font-mono">(Stage ${String(stageNum).padStart(2, '0')}) selected. Data actively passing through topic graph.</span>
          `;
        }

        const stage = stages.find(s => s.num === stageNum);
        if (stage) onSelectStage?.(stage);
      });
    });

    // Filter Buttons
    container.querySelectorAll('.algo-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        container.querySelectorAll('.algo-filter-btn').forEach(b => {
          b.className = "algo-filter-btn px-2.5 py-1 rounded text-slate-400 hover:text-white";
        });
        btn.className = "algo-filter-btn px-2.5 py-1 rounded text-cyan-300 bg-cyan-950/80 border border-cyan-500/40";
        drawWires();
      });
    });

    // Speed Controls
    container.querySelectorAll('.algo-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        animSpeed = parseFloat(btn.dataset.speed);
        container.querySelectorAll('.algo-speed-btn').forEach(b => {
          b.className = "algo-speed-btn px-2 py-1 rounded text-slate-400 hover:text-white";
        });
        btn.className = "algo-speed-btn px-2 py-1 rounded text-cyan-300 bg-cyan-950/80";
        drawWires();
      });
    });

    // Play / Pause
    const playBtn = container.querySelector('[data-action="toggle-play"]');
    const playIcon = container.querySelector('#algo-play-icon');
    const playText = container.querySelector('#algo-play-text');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        if (isPaused) {
          svg.pauseAnimations?.();
          playIcon.textContent = '▶';
          playText.textContent = 'Play Flow';
        } else {
          svg.unpauseAnimations?.();
          playIcon.textContent = '⏸';
          playText.textContent = 'Pause Flow';
        }
      });
    }
  }

  // Initialize
  renderTiers();
  setTimeout(() => {
    drawWires();
    bindEvents();
  }, 100);

  // Resize handling
  resizeObserver = new ResizeObserver(() => {
    drawWires();
  });
  resizeObserver.observe(canvas);

  return {
    setActiveStage(id) {
      const stage = stages.find(s => s.id === id);
      if (!stage) return;
      container.querySelectorAll('.algomaster-card').forEach(c => c.classList.remove('is-active'));
      const activeCard = container.querySelector(`#algo-stage-${stage.num}`);
      if (activeCard) {
        activeCard.classList.add('is-active');
      }
    },
    destroy() {
      resizeObserver?.disconnect();
      container.innerHTML = '';
    }
  };
}
