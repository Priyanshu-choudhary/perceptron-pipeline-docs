/**
 * Main Application Orchestrator for Perceptron Pipeline Docs
 */

import { PIPELINE_STAGES } from './pipeline-data.js';
import { RoverHeroScene } from './visualizers/three-scene.js';
import { PacketFlowEngine } from './packet-flow.js';
import { LidarSimulator } from './visualizers/lidar-sim.js';
import { KalmanSimulator } from './visualizers/kalman-sim.js';
import { PredictionSimulator } from './visualizers/prediction-sim.js';
import { CostmapSimulator } from './visualizers/costmap-sim.js';

class PipelineDocsApp {
  constructor() {
    this.currentMode = 'carla'; // 'carla' or 'real'
    this.activeStage = PIPELINE_STAGES[0];
    this.activeSim = null;

    this.init();
  }

  init() {
    this.renderPipelineTrack();
    this.setupScrollControls();
    this.setupModeToggle();
    this.initHeroScene();
    this.initPacketFlow();
    this.selectStage(PIPELINE_STAGES[4]); // Default select Stage 5 (LiDAR Preprocessing)
  }

  initHeroScene() {
    new RoverHeroScene('hero-3d-canvas');
  }

  initPacketFlow() {
    new PacketFlowEngine('packet-flow-canvas');
  }

  renderPipelineTrack() {
    const track = document.getElementById('pipeline-track');
    if (!track) return;

    track.innerHTML = PIPELINE_STAGES.map(stage => `
      <div class="stage-card ${stage.id === this.activeStage?.id ? 'active' : ''}" 
           id="card-${stage.id}"
           style="--card-accent: ${stage.color}; --card-glow: ${stage.bgGlow}"
           onclick="window.app.selectStageById('${stage.id}')">
        <div class="p-5 flex flex-col h-full justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md" 
                    style="background: rgba(255,255,255,0.06); color: ${stage.color}; border: 1px solid ${stage.color}40">
                STAGE ${stage.num < 10 ? '0' + stage.num : stage.num}
              </span>
              <span class="text-[11px] font-mono text-slate-400">
                ${stage.subSteps.length} Sub-steps
              </span>
            </div>

            <h3 class="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
              ${stage.title}
            </h3>
            
            <p class="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
              ${stage.summary}
            </p>
          </div>

          <div>
            <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" style="background: ${stage.color}"></span>
                <span>${stage.nodes.length} Nodes</span>
              </div>
              <a href="stages/${stage.slug}.html" class="text-cyan-400 hover:underline flex items-center gap-1" onclick="event.stopPropagation()">
                Details ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  setupScrollControls() {
    const track = document.getElementById('pipeline-track');
    const btnLeft = document.getElementById('scroll-left');
    const btnRight = document.getElementById('scroll-right');

    if (btnLeft && track) {
      btnLeft.addEventListener('click', () => {
        track.scrollBy({ left: -360, behavior: 'smooth' });
      });
    }
    if (btnRight && track) {
      btnRight.addEventListener('click', () => {
        track.scrollBy({ left: 360, behavior: 'smooth' });
      });
    }
  }

  setupModeToggle() {
    const btnCarla = document.getElementById('mode-carla');
    const btnReal = document.getElementById('mode-real');

    if (btnCarla && btnReal) {
      btnCarla.addEventListener('click', () => {
        this.currentMode = 'carla';
        btnCarla.className = "px-3 py-1.5 text-xs font-semibold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";
        btnReal.className = "px-3 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white";
        this.renderStageDetail(this.activeStage);
      });

      btnReal.addEventListener('click', () => {
        this.currentMode = 'real';
        btnReal.className = "px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
        btnCarla.className = "px-3 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white";
        this.renderStageDetail(this.activeStage);
      });
    }
  }

  selectStageById(id) {
    const stage = PIPELINE_STAGES.find(s => s.id === id);
    if (stage) this.selectStage(stage);
  }

  selectStage(stage) {
    this.activeStage = stage;

    // Update active card class
    document.querySelectorAll('.stage-card').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`card-${stage.id}`);
    if (activeEl) {
      activeEl.classList.add('active');
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    this.renderStageDetail(stage);
  }

  renderStageDetail(stage) {
    const container = document.getElementById('stage-detail-container');
    if (!container) return;

    if (this.activeSim) {
      this.activeSim.destroy();
      this.activeSim = null;
    }

    container.innerHTML = `
      <div class="glass-panel rounded-2xl p-6 md:p-8 border border-slate-800 glow-cyan animate-fade-in">
        <!-- Stage Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider" 
                    style="background: ${stage.color}20; color: ${stage.color}; border: 1px solid ${stage.color}60">
                Stage ${stage.num} • ${stage.badge}
              </span>
              <span class="text-xs font-mono text-slate-400">
                Active Target: ${this.currentMode === 'carla' ? 'CARLA Simulation Stack' : 'Physical Jetson & STM32'}
              </span>
            </div>
            <h2 class="text-2xl md:text-3xl font-extrabold text-white">
              ${stage.title}
            </h2>
          </div>

          <div class="flex items-center gap-3">
            <a href="stages/${stage.slug}.html" class="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center gap-2">
              <span>Full Stage Documentation</span>
              <span>→</span>
            </a>
          </div>
        </div>

        <p class="text-slate-300 text-sm md:text-base leading-relaxed my-6">
          ${stage.summary}
        </p>

        <!-- Sub-Steps Grid -->
        <div class="mb-8">
          <h4 class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full" style="background: ${stage.color}"></span>
            Sub-Stage Processing Pipeline (${stage.subSteps.length} Sequential Steps)
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${stage.subSteps.map(s => `
              <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400">Step ${s.step}</span>
                  <span class="text-[10px] font-mono text-slate-400">${s.rate}</span>
                </div>
                <h5 class="text-sm font-semibold text-white mb-1">${s.title}</h5>
                <p class="text-xs text-slate-400 leading-normal mb-2">${s.desc}</p>
                <div class="text-[10px] font-mono text-emerald-400">Frame: ${s.frame}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Interactive Visualizer + Topics Row -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Visualizer Column -->
          <div class="lg:col-span-7">
            <h4 class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Interactive Simulation & Telemetry
            </h4>
            <div class="sim-canvas-box" style="height: 340px;">
              <canvas id="active-stage-canvas" width="600" height="340" class="w-full h-full block"></canvas>
              <div id="sim-controls-mount" class="sim-overlay-controls"></div>
            </div>
          </div>

          <!-- Topics & Nodes Column -->
          <div class="lg:col-span-5 flex flex-col gap-4">
            <div>
              <h4 class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Associated ROS 2 Topics
              </h4>
              <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2.5 max-h-[160px] overflow-y-auto">
                ${stage.outputs.map(out => `
                  <div class="flex items-start justify-between border-b border-slate-800/60 pb-2">
                    <div>
                      <div class="text-cyan-300 font-bold">${out.topic}</div>
                      <div class="text-[10px] text-slate-400">${out.type}</div>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${out.rate || 'Event'}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div>
              <h4 class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Code & Node References
              </h4>
              <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-2">
                ${stage.nodes.map(n => `
                  <div class="flex items-center justify-between">
                    <span class="text-white font-semibold">${n.name}</span>
                    <a href="https://github.com/Priyanshu-choudhary/Perceptron_Ros2_Jetson_local/blob/feature/carla-sim-perception/${n.file || ''}" 
                       target="_blank" 
                       class="text-xs text-cyan-400 hover:underline">
                      view code ↗
                    </a>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Code Snippet Viewer -->
        <div class="mt-8">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              Core Mathematical & Algorithmic Implementation
            </h4>
            <span class="text-[11px] font-mono text-slate-400">Python 3 / ROS 2 Humble</span>
          </div>
          <pre class="code-container p-4"><code>${stage.codeSnippet}</code></pre>
        </div>
      </div>
    `;

    // Initialize the appropriate interactive canvas visualizer for this stage
    this.mountStageVisualizer(stage.num);
  }

  mountStageVisualizer(stageNum) {
    const controlsMount = document.getElementById('sim-controls-mount');

    if (stageNum === 5 || stageNum === 1) {
      // LiDAR Simulator
      const sim = new LidarSimulator('active-stage-canvas');
      this.activeSim = sim;
      if (controlsMount) {
        controlsMount.innerHTML = `
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input type="checkbox" id="chk-ground" checked class="rounded bg-slate-800 border-slate-700 text-cyan-500">
              <span>Filter Ground Plane (RANSAC)</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input type="checkbox" id="chk-clusters" checked class="rounded bg-slate-800 border-slate-700 text-cyan-500">
              <span>Show 2D Clusters</span>
            </label>
          </div>
          <span class="text-slate-400 font-mono text-[11px]">16 Beams • 10 Hz</span>
        `;
        document.getElementById('chk-ground')?.addEventListener('change', e => sim.setGroundFilter(e.target.checked));
        document.getElementById('chk-clusters')?.addEventListener('change', e => sim.setShowClusters(e.target.checked));
      }
    } else if (stageNum === 3 || stageNum === 7) {
      // Kalman Filter Simulator
      const sim = new KalmanSimulator('active-stage-canvas');
      this.activeSim = sim;
      if (controlsMount) {
        controlsMount.innerHTML = `
          <div class="flex items-center gap-2 text-slate-300">
            <span>Kalman State:</span>
            <span class="text-emerald-400 font-bold font-mono">CONFIRMED / COASTING</span>
          </div>
          <span class="text-slate-400 font-mono text-[11px]">Mahalanobis Gate: χ² ≤ 9.21 (99%)</span>
        `;
      }
    } else if (stageNum === 8) {
      // Trajectory Prediction Simulator
      const sim = new PredictionSimulator('active-stage-canvas');
      this.activeSim = sim;
      if (controlsMount) {
        controlsMount.innerHTML = `
          <div class="flex items-center gap-3 text-slate-300">
            <label class="flex items-center gap-1.5">
              <span>Prediction Horizon:</span>
              <select id="sel-horizon" class="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-300">
                <option value="2.0">2.0 seconds</option>
                <option value="1.0">1.0 second</option>
                <option value="0.5">0.5 seconds</option>
              </select>
            </label>
          </div>
          <span class="text-slate-400 font-mono text-[11px]">Models: CV & CTRV</span>
        `;
        document.getElementById('sel-horizon')?.addEventListener('change', e => sim.setHorizon(e.target.value));
      }
    } else if (stageNum === 9 || stageNum === 10) {
      // Costmap Simulator
      const sim = new CostmapSimulator('active-stage-canvas');
      this.activeSim = sim;
      if (controlsMount) {
        controlsMount.innerHTML = `
          <div class="flex items-center gap-3 text-slate-300">
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" id="chk-voxels" checked> <span>L1: Voxels</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" id="chk-infl" checked> <span>L2: Inflation</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" id="chk-risk" checked> <span>L3: Risk Ribbons</span>
            </label>
          </div>
          <span class="text-slate-400 font-mono text-[11px]">Combined Max-Pool Grid</span>
        `;
        const updateLayers = () => {
          sim.setLayers({
            voxels: document.getElementById('chk-voxels')?.checked,
            inflation: document.getElementById('chk-infl')?.checked,
            dynamicRisk: document.getElementById('chk-risk')?.checked
          });
        };
        document.getElementById('chk-voxels')?.addEventListener('change', updateLayers);
        document.getElementById('chk-infl')?.addEventListener('change', updateLayers);
        document.getElementById('chk-risk')?.addEventListener('change', updateLayers);
      }
    } else {
      // Default fallback: Three.js or simple animated stream
      const sim = new LidarSimulator('active-stage-canvas');
      this.activeSim = sim;
    }
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.app = new PipelineDocsApp();
});
